from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
import numpy as np
from dotenv import load_dotenv
import time
import psycopg2
import spacy
from sklearn.metrics.pairwise import cosine_similarity
import os

load_dotenv()
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

client = Groq(
    api_key=os.environ.get("GROQ_API_KEY"),
)

nlp = spacy.load('en_core_web_md')

# connect to the database
def db_connect():
    connection = psycopg2.connect(
        host=os.getenv('DATABASE_HOST'),
        port=os.getenv('DATABASE_PORT'),
        dbname=os.getenv('DATABASE_NAME'),
        user=os.getenv('DATABASE_USER'),
        password=os.getenv('DATABASE_PASSWORD'),
    )
    if (connection):
        print("connection successful.")
    else:
        print("DB connection unsuccessful.")
    return connection

# api set up
def query_llm(prompt, model_name):
    try:
        llm_response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        if llm_response:
            response = llm_response.choices[0].message.content
            return response
        else:
            print(f"Error: No choices in response {llm_response}")
            return None
    except Exception as e:
        print(f"Error: {e}")
        return None

# calculating the accuracy of the response to the ground truth
def calc_accuracy(model_output, ground_truth):
    model = nlp(model_output)
    truth = nlp(ground_truth)

    similarity = cosine_similarity([model.vector], [truth.vector])[0][0]
    return similarity

# calculating the relevance of the response to the expected output
def calc_relevance(model_output, expected_output):
    model = nlp(model_output)
    expected = nlp(expected_output)

    similarity = cosine_similarity([model.vector], [expected.vector])[0][0]
    return similarity


@app.route('/evaluate', methods=['POST'])
def evaluate():
    data = request.json
    prompt = data.get('prompt')
    ground_truth = query_llm(prompt, "llama-3.1-70b-versatile")
    expected_output = query_llm(f"What would be an ideal response to: {prompt}?", "llama-3.1-70b-versatile")

    llm_responses = []
    llm_names = ['gemma2-9b-it', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']

    response_times = []

    for llm in llm_names:
        start_time = time.time()
        response = query_llm(prompt, llm)
        response_time = time.time() - start_time
        response_times.append(response_time)
    
        accuracy = calc_accuracy(response, ground_truth)
        relevance = calc_relevance(response, expected_output)

        accuracy = float(accuracy) if isinstance(accuracy, np.float32) else accuracy
        relevance = float(relevance) if isinstance(relevance, np.float32) else relevance
        response_time = float(response_time) if isinstance(response_time, np.float32) else response_time

        llm_responses.append({
            'llm': llm,
            'response': response,
            'accuracy': accuracy,
            'relevance': relevance,
            'response_time': response_time
        })

        # save result in DB
        connect = db_connect()
        cursor = connect.cursor()
        cursor.execute("""
            INSERT INTO results (llm_name, prompt, response, accuracy, relevance, response_time) 
            VALUES (%s, %s, %s, %s, %s, %s)
            """, (llm, prompt, response, accuracy, relevance, response_time))
        connect.commit()
        cursor.close()
        connect.close()

    return jsonify({
        'llm_responses': llm_responses,
        'response_time': response_time
    })
    

@app.route('/get_results', methods=['GET'])
def get_results():
    connect = db_connect()
    cursor = connect.cursor()
    cursor.execute("SELECT * FROM results ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    connect.close()

    results = []
    for row in rows:
        results.append({
            'llm_name': row[0],
            'prompt': row[1],
            'response': row[2],
            'accuracy': row[3],
            'relevance': row[4],
            'response_time': row[5],
            'timestamp': row[6]
        })

    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True)