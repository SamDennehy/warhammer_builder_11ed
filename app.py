from flask import Flask, render_template, request, redirect, url_for, jsonify
from models import Model, Unit, Army
import json
app = Flask(__name__)

with open('armies/factions.json', 'r') as f:
    factions = json.load(f)

army = Army("Army List")

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

@app.route('/append_unit_to_army', methods=['POST'])
def appendUnitToArmy():
    data = request.get_json()
    models = data.get("models", [])
    unit = Unit(
        data.get("datasheet_name", ""),
        data.get("datasheet_id", ""),
        data.get("weapons", []),
        data.get("wargear", []),
        data.get("weapon_groups", []),
        data.get("weapon_selections", {}),
        data.get("wargear_selections", {}),
    )
    for model in models:
        currentModel = Model(
            model["model_name"],
            model["model_id"],
            model["stats"],
            model["count"],
        )
        unit.appendModel(currentModel)

    validation_errors = unit.validateSelections()
    if validation_errors:
        return jsonify({"success": False, "errors": validation_errors}), 400

    army.appendUnit(unit)
    return jsonify({"success": True})

@app.route('/get_army_data_as_JSON', methods=['GET'])
def getArmyDataAsJSON():
    return jsonify(army.to_dict())

@app.route('/validate_army', methods=['POST'])
def validateArmy():
    data = request.get_json() or {}
    selections_by_unit = data.get("units", {})

    for unit in army.getUnits():
        selections = selections_by_unit.get(str(unit.unit_instance_id), {})
        unit.weapon_selections = selections.get("weapon_selections", {})
        unit.wargear_selections = selections.get("wargear_selections", {})

    errors = army.validate()
    return jsonify({
        "valid": not errors,
        "errors": errors,
    }), 200 if not errors else 400


if __name__ == "__main__":
    app.run(debug=True)