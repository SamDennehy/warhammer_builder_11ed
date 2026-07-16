from flask import Flask, render_template, request, redirect, url_for, jsonify
from models import Model, Unit, Army
import json
app = Flask(__name__)

with open('armies/factions.json', 'r') as f:
    factions = json.load(f)

army = Army("Army List")

@app.route('/')
def index():
    return render_template('index.html', factions=factions, army=army)

@app.route('/get_faction_datasheets_by_path', methods=['POST'])
def getFactionDatasheetsByPath():
    data = request.get_json()
    path = f"{data.get('path')}/datasheets.json"
    with open(path, 'r') as f:
        datasheets = json.load(f)

    return jsonify(datasheets)

@app.route('/append_unit_to_army', methods=['POST'])
def appendUnitToArmy():
    data = request.get_json()
    models = data.models
    unit = Unit(data.datasheet_name, data.datasheet_id)
    for model in models:
        unit.appendModel(model.model_name, model.model_id, model.stats)
    army.appendUnit(unit)

if __name__ == "__main__":
    app.run(debug=True)