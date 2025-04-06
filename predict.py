import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics.pairwise import cosine_similarity

# Step 1: Load Data
def load_data(file_path):
    df = pd.read_csv(file_path)
    return df

# Step 2: Encode Categorical Features
def preprocess_data(df):
    # Print column names to check
    print("Available Columns:", df.columns.tolist())

# Use only existing columns"
    existing_cols = ["Body Type","Sex","Diet","How Often Shower","Heating Energy Source","Transport","Vehicle Type","Social Activity","Monthly Grocery Bill","Frequency of Traveling by Air","Vehicle Monthly Distance Km","Waste Bag Size","Waste Bag Weekly Count","How Long TV PC Daily Hour","How Many New Clothes Monthly","How Long Internet Daily Hour","Energy efficiency","Recycling","Cooking_With"]
    categorical_cols = [col for col in existing_cols if col in df.columns]  
    
    label_encoders = {}
    for col in categorical_cols:
        label_encoders[col] = LabelEncoder()
        df[col] = label_encoders[col].fit_transform(df[col])
    
    df.fillna(0, inplace=True)  # Handle missing values
    return df

# Step 3: Compute Similarity Matrix
def compute_similarity_matrix(df):
    numeric_df = df.select_dtypes(include=[np.number])  # Use only numerical columns
    similarity_matrix = cosine_similarity(numeric_df)
    return similarity_matrix

# Step 4: Recommend Users with Similar Footprints
def recommend_users(user_id, df, similarity_matrix, top_n=5):
    """Recommend similar users based on similarity scores."""
    user_idx = df.index.get_loc(user_id)
    similar_users = np.argsort(similarity_matrix[user_idx])[::-1][1:top_n+1]
    return df.iloc[similar_users]

# Step 5: Predict Carbon Footprint for a New User
def predict_carbon_footprint(new_user_data, df, similarity_matrix):
    df_numeric = df.select_dtypes(include=[np.number])
    new_user_df = pd.DataFrame([new_user_data], columns=df_numeric.columns)
    
    new_user_similarity = cosine_similarity(new_user_df, df_numeric)
    most_similar_user_idx = np.argmax(new_user_similarity)
    
    predicted_carbon = df.iloc[most_similar_user_idx]["Total_Carbon_Footprint"]
    return predicted_carbon

# Load and preprocess data
dataset_path = "cleaned_individual_footprint.csv"  # Update with actual path
df = load_data(dataset_path)
df = preprocess_data(df)

# Compute similarity matrix
similarity_matrix = compute_similarity_matrix(df)

# Example: Recommend users similar to user at index 10
recommended_users = recommend_users(10, df, similarity_matrix)
print("Recommended Similar Users:")
print(recommended_users)

# Example: Predict carbon footprint for a new user
new_user_data = [1, 0, 2, 1, 3, 2, 150, 2500, 3, 7, 2, 1, 1, 2700]  # 14 values
  # Example input
print("Number of numerical columns in dataset:", len(df.select_dtypes(include=[np.number]).columns))
print("Columns:", df.select_dtypes(include=[np.number]).columns.tolist())

predicted_footprint = predict_carbon_footprint(new_user_data, df, similarity_matrix)
print(f"Predicted Carbon Footprint: {predicted_footprint}")
