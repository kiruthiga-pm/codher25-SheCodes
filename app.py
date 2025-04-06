from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics.pairwise import cosine_similarity
from pymongo import MongoClient
from collections import Counter
from confluent_kafka import Producer
import json
from datetime import datetime

now = datetime.now()
month = now.strftime("%B")  # e.g., "April"
year = now.year     
app = Flask(__name__)
CORS(app)

# MongoDB Setup
client = MongoClient('mongodb://localhost:27017/')
db = client['carbon_footprint_db']
users_collection = db['users']
aggregated_collection = db['aggregate']
reduction_collection = db['reduction_insights']

# Kafka Producer Setup
kafka_conf = {
    'bootstrap.servers': 'localhost:9092'
}
kafka_producer = Producer(kafka_conf)
KAFKA_TOPIC = 'carbon-footprint-events'

def kafka_delivery_callback(err, msg):
    if err:
        print(f"❌ Kafka Delivery Failed: {err}")
    else:
        print(f"✅ Kafka Message delivered to {msg.topic()} [{msg.partition()}]")

# Utility Functions
def convert_numpy_types(data):
    if isinstance(data, dict):
        return {key: convert_numpy_types(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [convert_numpy_types(item) for item in data]
    elif isinstance(data, np.generic):
        return data.item()
    else:
        return data

def calculate_aggregate(username, user_data=None):
    if not user_data:
        return {}

    numerical_cols = [
        "Monthly Grocery Bill", "Vehicle Monthly Distance Km", "Waste Bag Weekly Count",
        "How Long TV PC Daily Hour", "How Many New Clothes Monthly", "How Long Internet Daily Hour"
    ]
    categorical_cols = [
        "Body Type", "Sex", "Diet", "How Often Shower", "Heating Energy Source", "Transport",
        "Vehicle Type", "Social Activity", "Frequency of Traveling by Air", "Waste Bag Size",
        "Energy efficiency", "Recycling", "Cooking_With"
    ]

    existing_aggregate = aggregated_collection.find_one({"username": username})
    if existing_aggregate:
        aggregated_data = existing_aggregate
        for col in numerical_cols:
            new_value = float(user_data.get(col, 0))
            past_value = float(aggregated_data.get(col, 0))
            aggregated_data[col] = round((past_value + new_value) / 2, 2)

        for col in categorical_cols:
            past_values = existing_aggregate.get(f"{col}_history", [])
            new_value = user_data.get(col)
            if not isinstance(past_values, list):
                past_values = [past_values]
            past_values.append(new_value)
            aggregated_data[f"{col}_history"] = past_values
            aggregated_data[col] = Counter(past_values).most_common(1)[0][0]
    else:
        aggregated_data = {"username": username}
        for col in numerical_cols:
            aggregated_data[col] = float(user_data.get(col, 0))
        for col in categorical_cols:
            aggregated_data[col] = user_data.get(col)

    return convert_numpy_types(aggregated_data)

# Dataset & Preprocessing
dataset_path = "cleaned_individual_footprint.csv"
all_cols = [
    "Body Type", "Sex", "Diet", "How Often Shower", "Heating Energy Source",
    "Transport", "Vehicle Type", "Social Activity", "Monthly Grocery Bill",
    "Frequency of Traveling by Air", "Vehicle Monthly Distance Km", "Waste Bag Size",
    "Waste Bag Weekly Count", "How Long TV PC Daily Hour", "How Many New Clothes Monthly",
    "How Long Internet Daily Hour", "Energy efficiency", "Recycling", "Cooking_With",
    "Total_Carbon_Footprint", "Footprint_Category"
]

def load_data(file_path):
    try:
        return pd.read_csv(file_path)
    except FileNotFoundError:
        return None

def preprocess_data(df):
    if df is None:
        return None, None
    label_encoders = {}
    categorical_cols = [col for col in all_cols if col in df.columns and df[col].dtype == 'object']
    for col in categorical_cols:
        label_encoders[col] = LabelEncoder()
        df[col] = label_encoders[col].fit_transform(df[col])
    df.fillna(0, inplace=True)
    return df, label_encoders

def compute_similarity_matrix(df):
    if df is None:
        return None
    numeric_df = df.drop(columns=["Total_Carbon_Footprint", "Footprint_Category"], errors='ignore')
    return cosine_similarity(numeric_df)

def encode_new_user(user_data, label_encoders, df):
    encoded_data = {}
    for col in df.columns:
        if col in label_encoders:
            if user_data.get(col) in label_encoders[col].classes_:
                encoded_data[col] = label_encoders[col].transform([user_data[col]])[0]
            else:
                encoded_data[col] = 0
        elif col in user_data:
            encoded_data[col] = float(user_data[col])
        else:
            encoded_data[col] = 0
    return convert_numpy_types(encoded_data)

def predict_carbon_footprint(new_user_data, df, similarity_matrix):
    df_numeric = df.drop(columns=["Total_Carbon_Footprint", "Footprint_Category"], errors='ignore')
    new_user_df = pd.DataFrame([new_user_data], columns=df_numeric.columns)
    similarity_scores = cosine_similarity(new_user_df, df_numeric)
    most_similar_user_idx = np.argmax(similarity_scores)
    return float(df.iloc[most_similar_user_idx]["Total_Carbon_Footprint"]), similarity_scores[0]

df = load_data(dataset_path)
df, label_encoders = preprocess_data(df)
similarity_matrix = compute_similarity_matrix(df)

# Routes
@app.route('/predict', methods=['POST'])
def predict_carbon():
    try:
        user_data = request.json.get("user_data", {})
        username = request.json.get("username", "")

        if not user_data or not username:
            return jsonify({"error": "Invalid input"}), 400

        encoded_user_data = encode_new_user(user_data, label_encoders, df)
        predicted_footprint, similarity_scores = predict_carbon_footprint(encoded_user_data, df, similarity_matrix)

        # Store to Mongo
        users_collection.insert_one({
            "username": username,
            "user_data": convert_numpy_types(user_data),
            "predicted_footprint": predicted_footprint,
            "month": month,
    "year": year
        })

        # Send to Kafka
        kafka_event = {
            "username": username,
            "predicted_footprint": predicted_footprint,
            "event_type": "prediction",
            "user_data": convert_numpy_types(user_data)
        }
        kafka_producer.produce(KAFKA_TOPIC, key=username, value=json.dumps(kafka_event), callback=kafka_delivery_callback)
        kafka_producer.flush()

        aggregated_data = calculate_aggregate(username, user_data)
        aggregated_collection.update_one(
            {"username": username},
            {"$set": aggregated_data},
            upsert=True
        )

        similar_users_recommendations = []
        all_users = list(aggregated_collection.find({"username": {"$ne": username}}))
        if all_users:
            agg_df = pd.DataFrame(all_users)
            usernames_list = agg_df["username"].tolist()
            agg_df = agg_df.drop(columns=["username", "_id"], errors="ignore")
            for col in agg_df.columns:
                agg_df[col] = agg_df[col].apply(lambda x: Counter(x).most_common(1)[0][0] if isinstance(x, list) else x)

            current_agg = aggregated_data.copy()
            current_agg.pop("username", None)
            current_agg = {k: Counter(v).most_common(1)[0][0] if isinstance(v, list) else v for k, v in current_agg.items()}
            current_df = pd.DataFrame([current_agg])
            full_df = pd.concat([agg_df, current_df], ignore_index=True)

            for col in full_df.columns:
                if full_df[col].dtype == object:
                    le = LabelEncoder()
                    full_df[col] = le.fit_transform(full_df[col].astype(str))

            sim_matrix = cosine_similarity(full_df)
            current_user_index = len(full_df) - 1
            sim_scores = list(enumerate(sim_matrix[current_user_index][:-1]))
            top_similar = sorted(sim_scores, key=lambda x: x[1], reverse=True)[:3]
            similar_usernames = [usernames_list[idx] for idx, _ in top_similar]

            for sim_user in similar_usernames:
                reduction_entry = reduction_collection.find_one({"username": sim_user})
                if reduction_entry:
                    for item in reduction_entry.get("reducing_attributes", []):
                        for attr, _ in item.items():
                            similar_users_recommendations.append(attr)

        recommended_actions = [
            {"attribute": attr, "count": count}
            for attr, count in Counter(similar_users_recommendations).most_common(5)
        ]

        return jsonify({
            "predicted_footprint": predicted_footprint,
            "recommendations": recommended_actions
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze_reduction/<username>', methods=['GET'])
def analyze_reduction(username):
    try:
        analyze_reducing_attributes(username)
        result = reduction_collection.find_one({"username": username}, {"_id": 0})
        if result:
            return jsonify(result)
        else:
            return jsonify({"message": "No reduction data found for this user."}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def analyze_reducing_attributes(username):
    user_entries = list(users_collection.find({"username": username}))
    if len(user_entries) < 2:
        return

    user_entries.sort(key=lambda x: x['_id'])
    total_reduction = 0
    reducing_feature_contributions = {}

    for i in range(len(user_entries)):
        for j in range(i + 1, len(user_entries)):
            entry_i = user_entries[i]
            entry_j = user_entries[j]
            fp_i = float(entry_i.get("predicted_footprint", 0))
            fp_j = float(entry_j.get("predicted_footprint", 0))

            if fp_j < fp_i:
                reduction_amount = round(fp_i - fp_j, 2)
                total_reduction += reduction_amount

                data_i = entry_i.get("user_data", {})
                data_j = entry_j.get("user_data", {})

                for key in data_j:
                    if key == "Sex":
                        continue

                    val_i = data_i.get(key)
                    val_j = data_j.get(key)

                    try:
                        if float(val_i) != float(val_j):
                            reducing_feature_contributions[key] = reducing_feature_contributions.get(key, 0) + reduction_amount
                    except:
                        if str(val_i).strip().lower() != str(val_j).strip().lower():
                            reducing_feature_contributions[key] = reducing_feature_contributions.get(key, 0) + reduction_amount

    percent_features = [
        {k: round((v / total_reduction) * 100, 2)}
        for k, v in sorted(reducing_feature_contributions.items(), key=lambda x: -x[1])[:5]
    ] if total_reduction > 0 else []

    reduction_collection.update_one(
        {"username": username},
        {
            "$set": {
                "username": username,
                "reduced_amount": round(total_reduction, 2),
                "reducing_attributes": percent_features
            }
        },
        upsert=True
    )

if __name__ == '__main__':
    app.run(port=5001)
