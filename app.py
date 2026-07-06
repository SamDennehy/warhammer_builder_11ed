from flask import Flask, render_template, request, redirect, url_for, jsonify
import json
app = Flask(__name__)

factions = ["Space Marines", "Adeptus Mechanicus", "Astra Militarum", "Chaos Space Marines", "Drukhari", "Genestealer Cults", "Grey Knights", "Imperial Knights", "Necrons", "Orks", "T'au Empire", "Thousand Sons", "Tyranids"]

@app.route('/')
def index():
    return render_template('index.html', factions=factions)

@app.route('/get_faction_data', methods=['POST'])
def get_faction_data():
    data = request.get_json()
    faction = data.get('faction')
    # Here you would typically fetch the data for the selected faction from your database or other source
    # For now, we'll just return a simple response
    return jsonify({"faction": faction, "data": "This is the data for {}".format(faction)})

if __name__ == "__main__":
    app.run(debug=True)