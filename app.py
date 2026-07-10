from flask import Flask, render_template, request, redirect, url_for, jsonify
import json
app = Flask(__name__)

with open('armies/factions.json', 'r') as f:
    factions = json.load(f)

@app.route('/')
def index():
    return render_template('index.html', factions=factions)

@app.route('/get_faction_datasheets_by_path', methods=['POST'])
def getFactionDatasheetsByPath():
    data = request.get_json()
    path = f"{data.get('path')}/datasheets.json"
    with open(path, 'r') as f:
        datasheets = json.load(f)

    return jsonify(datasheets)

if __name__ == "__main__":
    app.run(debug=True)