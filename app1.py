from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics.pairwise import cosine_similarity
from pymongo import MongoClient
from collections import Counter

app = Flask(__name__)
CORS(app)

# MongoDB setup
client = MongoClient('mongodb://localhost:27017/')
db = client['carbon_footprint_db']
users_collection = db['users']
aggregated_collection = db['aggregate']

# Convert numpy types to native Python types
def convert_numpy_types(data):
    if isinstance(data, dict):
        return {key: convert_numpy_types(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [convert_numpy_types(item) for item in data]
    elif isinstance(data, np.generic):
        return data.item()
    else:
        return data

# Calculate aggregated data per user
def calculate_aggregate(username, user_data=None):
    if not user_data:
        print(f"No user_data provided for {username}.")
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
        print(f"Updating existing aggregated data for {username}")
        aggregated_data = existing_aggregate

        for col in numerical_cols:
            try:
                new_value = float(user_data.get(col, 0))
            except ValueError:
                new_value = 0
            past_value = float(aggregated_data.get(col, 0))
            aggregated_data[col] = round((past_value + new_value) / 2, 2)

        for col in categorical_cols:
            past_values = existing_aggregate.get(f"{col}_history", [])
            new_value = user_data.get(col)

            if not isinstance(past_values, list):
                past_values = [past_values]

            past_values.append(new_value)

    # Store the full history
            aggregated_data[f"{col}_history"] = past_values

    # Set the most frequent as the current value
            aggregated_data[col] = Counter(past_values).most_common(1)[0][0]

    else:
        print(f"Creating new aggregated data for {username}")
        aggregated_data = {"username": username}
        for col in numerical_cols:
            try:
                aggregated_data[col] = float(user_data.get(col, 0))
            except ValueError:
                aggregated_data[col] = 0
        for col in categorical_cols:
            aggregated_data[col] = user_data.get(col)

    return convert_numpy_types(aggregated_data)

# Load and preprocess data
def load_data(file_path):
    try:
        df = pd.read_csv(file_path)
        print(f"Dataset '{file_path}' loaded successfully. Shape: {df.shape}")
        return df
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
        return None

all_cols = [
    "Body Type", "Sex", "Diet", "How Often Shower", "Heating Energy Source",
    "Transport", "Vehicle Type", "Social Activity", "Monthly Grocery Bill",
    "Frequency of Traveling by Air", "Vehicle Monthly Distance Km", "Waste Bag Size",
    "Waste Bag Weekly Count", "How Long TV PC Daily Hour", "How Many New Clothes Monthly",
    "How Long Internet Daily Hour", "Energy efficiency", "Recycling", "Cooking_With",
    "Total_Carbon_Footprint", "Footprint_Category"
]

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
            try:
                encoded_data[col] = float(user_data[col])
            except ValueError:
                encoded_data[col] = 0
        else:
            encoded_data[col] = 0

    return convert_numpy_types(encoded_data)

def predict_carbon_footprint(new_user_data, df, similarity_matrix):
    df_numeric = df.drop(columns=["Total_Carbon_Footprint", "Footprint_Category"], errors='ignore')
    new_user_df = pd.DataFrame([new_user_data], columns=df_numeric.columns)
    similarity_scores = cosine_similarity(new_user_df, df_numeric)
    most_similar_user_idx = np.argmax(similarity_scores)
    return float(df.iloc[most_similar_user_idx]["Total_Carbon_Footprint"])

# Load and preprocess
dataset_path = "cleaned_individual_footprint.csv"
df = load_data(dataset_path)
df, label_encoders = preprocess_data(df)
similarity_matrix = compute_similarity_matrix(df)

@app.route('/predict', methods=['POST'])
def predict_carbon():
    try:
        user_data = request.json.get("user_data", {})
        username = request.json.get("username", "")

        if not user_data or not username:
            return jsonify({"error": "Invalid input. 'user_data' and 'username' are required."}), 400

        encoded_user_data = encode_new_user(user_data, label_encoders, df)
        predicted_footprint = predict_carbon_footprint(encoded_user_data, df, similarity_matrix)

        users_collection.insert_one({
            "username": username,
            "user_data": convert_numpy_types(user_data),
            "predicted_footprint": predicted_footprint
        })

        aggregated_data = calculate_aggregate(username, user_data)
        aggregated_collection.update_one(
            {"username": username},
            {"$set": aggregated_data},
            upsert=True
        )

        return jsonify({"predicted_footprint": predicted_footprint})

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
