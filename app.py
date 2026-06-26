from flask import Flask, render_template, request, redirect, url_for, jsonify
import json
app = Flask(__name__)

global lastModelNumber
# lastModelNumber: int -> global incrementing counter for stable model instance IDs.
lastModelNumber = 0

global lastUnitNumber
# lastUnitNumber: int -> global incrementing counter for stable unit instance IDs.
lastUnitNumber = 0

def getData(filePath: str):
    # filePath: str, data: dict -> reads and parses a JSON data file.
    with open (filePath) as f:
        data = json.load(f)
    return data

def get_unit_by_id(unit_id):
    # unit_id: str, unit: dict -> returns the matching unit object or None.
    for unit in units:
        if unit["unit_id"] == unit_id:
            return unit
    return None

def get_default_model_loadouts(unit_data, model_numbers=None):
    # model_loadouts: dict[str, dict] -> model_number to default selection state.
    model_loadouts = {}

    for model in unit_data.get("models", []):
        # model: dict, model_id: str | None
        model_id = model.get("model_id")
        if not model_id:
            continue

        # default_weapons: dict[str, str] -> option group to selected weapon ID.
        default_weapons = {}
        for option in model.get("weapon_options", []):
            choices = option.get("choices", [])
            if choices:
                default_weapons[option["group"]] = choices[0]

        # default_wargear: dict[str, str] -> option group to selected wargear ID.
        default_wargear = {}
        for option in model.get("wargear_options", []):
            choices = option.get("choices", [])
            if choices:
                default_wargear[option["group"]] = choices[0]

        # model_range: list[int], default_count: int
        model_range = model.get("model_range", [1, 1])
        default_count = model_range[0] if model_range else 1

        # Use per-instance keys when model_numbers are available.
        model_number_values = (model_numbers or {}).get(model_id, [])
        if model_number_values:
            for model_number in model_number_values:
                model_loadouts[str(model_number)] = {
                    "count": 1,
                    "weapons": default_weapons.copy(),
                    "wargear": default_wargear.copy(),
                }
        else:
            model_loadouts[model_id] = {
                "count": default_count,
                "weapons": default_weapons,
                "wargear": default_wargear,
            }

    return model_loadouts

def get_model_numbers_for_unit(unit_data):
    # model_numbers: dict[str, list[int]] -> model_id to persistent instance numbers.
    model_numbers = {}

    for model in unit_data.get("models", []):
        # model_id: str | None
        model_id = model.get("model_id")
        if not model_id:
            continue

        model_numbers[model_id] = []
        # instance_count: int -> how many model instances are generated for this profile.
        model_range = model.get("model_range", [1, 1])
        instance_count = model_range[0] if model_range else 1

        global lastModelNumber
        for _ in range(instance_count):
            lastModelNumber += 1
            model_numbers[model_id].append(lastModelNumber)

    return model_numbers

def format_profiles(profiles):
    # profiles: list[dict], formatted_profiles: list[dict]
    formatted_profiles = []
    for profile in profiles:
        # formatted_profile: dict -> normalized to always expose "name" when available.
        formatted_profile = profile.copy() if isinstance(profile, dict) else {}
        if "profile_name" in profile:
            formatted_profile["name"] = profile["profile_name"]
        formatted_profiles.append(formatted_profile)
    return formatted_profiles

def format_wargear_entry(wargear):
    # wargear: str | dict -> always returns dict with id/name/description keys.
    if isinstance(wargear, str):
        return {
            "id": wargear,
            "name": wargear,
        }

    return {
        "id": wargear.get("wargear_id", wargear.get("id", "unknown_wargear")),
        "name": wargear.get("wargear_name", wargear.get("name", "Unknown Wargear")),
        "description": wargear.get("description", "")
    }

def build_army_for_ui():
    # formatted_army: list[dict] -> final response payload used by frontend rendering.
    formatted_army = []
    global lastUnitNumber

    for army_unit in army:
        # army_unit: dict -> runtime unit state in the in-memory army list.
        unit_data = get_unit_by_id(army_unit["unit_id"])

        if unit_data:
            # Ensure each army unit has a persistent unit_number
            if "unit_number" not in army_unit or army_unit.get("unit_number") is None:
                lastUnitNumber += 1
                army_unit["unit_number"] = lastUnitNumber
            # model_numbers: dict[str, list[int]] -> stable model_number values per model_id.
            model_numbers = army_unit.get("model_numbers", {})
            if not model_numbers:
                model_numbers = get_model_numbers_for_unit(unit_data)
                army_unit["model_numbers"] = model_numbers

            # model_loadouts: dict[str, dict] -> selected weapons/wargear per model_number.
            model_loadouts = army_unit.get("model_loadouts", {})

            # Migrate legacy per-model_id loadout maps into per-model_number maps.
            valid_model_numbers = {
                str(number)
                for numbers in model_numbers.values()
                for number in numbers
            }
            if model_loadouts and not any(str(key) in valid_model_numbers for key in model_loadouts.keys()):
                migrated_loadouts = {}
                for model in unit_data.get("models", []):
                    model_id = model.get("model_id")
                    if not model_id:
                        continue

                    source_state = model_loadouts.get(model_id, {"weapons": {}, "wargear": {}})
                    for model_number in model_numbers.get(model_id, []):
                        migrated_loadouts[str(model_number)] = {
                            "count": 1,
                            "weapons": dict(source_state.get("weapons", {})),
                            "wargear": dict(source_state.get("wargear", {})),
                        }

                model_loadouts = migrated_loadouts
                army_unit["model_loadouts"] = model_loadouts

            if not model_loadouts:
                model_loadouts = get_default_model_loadouts(unit_data, model_numbers)
                army_unit["model_loadouts"] = model_loadouts

            # formatted_models: list[dict] -> model cards for this unit.
            formatted_models = []
            for model in unit_data.get("models", []):
                for i in range(model.get("model_range", [1, 1])[0]):
                    # model_id: str, model_state: dict, model_number: int | None
                    model_id = model.get("model_id")
                    model_number_values = model_numbers.get(model_id, [])
                    model_number = model_number_values[i] if i < len(model_number_values) else None
                    model_state = model_loadouts.get(str(model_number), {"weapons": {}, "wargear": {}})

                    # selected_weapons: list[dict] -> resolved weapon details for the chosen loadout.
                    selected_weapons = []
                    for group, weapon_id in model_state.get("weapons", {}).items():
                        weapon = next((w for w in model.get("weapons", []) if w.get("weapon_id") == weapon_id), None)
                        if weapon:
                            selected_weapons.append({
                                "group": group,
                                "id": weapon.get("weapon_id"),
                                "name": weapon.get("weapon_name"),
                                "type": weapon.get("type"),
                                "profiles": format_profiles(weapon.get("profiles", []))
                            })

                    # selected_wargear: list[dict] -> resolved wargear details for the chosen loadout.
                    selected_wargear = []
                    for group, wargear_id in model_state.get("wargear", {}).items():
                        wargear = next(
                            (
                                item for item in model.get("wargear", [])
                                if (isinstance(item, str) and item == wargear_id) or
                                (isinstance(item, dict) and (item.get("wargear_id") == wargear_id or item.get("id") == wargear_id))
                            ),
                            None
                        )

                        if wargear:
                            # formatted_wargear: dict -> normalized wargear object with group metadata.
                            formatted_wargear = format_wargear_entry(wargear)
                            formatted_wargear["group"] = group
                            selected_wargear.append(formatted_wargear)

                    # default_count: int -> fallback model count if explicit state is missing.
                    model_range = model.get("model_range", [1, 1])
                    default_count = model_range[0] if model_range else 1
                    formatted_models.append({
                        "model_number": model_number,
                        "model_id": model_id,
                        "name": model.get("model_name", model_id),
                        "count": model_state.get("count", default_count),
                        "range": model.get("model_range", [1, 1]),
                        "stats": model.get("stats", {}),
                        "weapon_options": model.get("weapon_options", []),
                        "wargear_options": model.get("wargear_options", []),
                        "weapons": model_state.get("weapons", {}),
                        "wargear": model_state.get("wargear", {}),
                        "available_weapons": [
                            {
                                "id": weapon.get("weapon_id"),
                                "name": weapon.get("weapon_name")
                            } for weapon in model.get("weapons", [])
                        ],
                        "available_wargear": [
                            format_wargear_entry(item) for item in model.get("wargear", [])
                        ],
                        "selected_weapons": selected_weapons,
                        "selected_wargear": selected_wargear,
                    })

            formatted_army.append({
                "unit_number": army_unit.get("unit_number"),
                "unit_id": unit_data["unit_id"],
                "name": unit_data["unit_name"],
                "points": unit_data["points_range"][0],  # Assuming the first value is the base points
                "points_range": unit_data.get("points_range", []),
                "unit_range": unit_data.get("unit_range", []),
                "abilities": unit_data.get("abilities", {"core": [], "personal": []}),
                "models": formatted_models,
            })

    return formatted_army

# Load units from JSON
# data: dict -> master data for units, detachments, and ability rules.
data = getData("armies/chaos_knights/chaos_knights.json")
# units: list[dict], detachments: list[dict]
units = data["units"]
detachments = data["detachments"]
# armyRules/detachmentRules/armyAbilities: dict[str, dict]
armyRules = data["abilities"]["army_rules"]
detachmentRules = data["abilities"]["detachment_rules"]
armyAbilities = data["abilities"]["abilities"]

# currentArmy/currentDetachment are template context values (None until selected).
currentArmy = None
currentDetachment = None

# Store army list in memory (for simplicity)
# army: list[dict] -> active runtime roster state for this server process.
army = []

# armyRuleFiles/detachmentRuleFiles: list[dict[str, str]] -> rule key to file text.
armyRuleFiles = []
detachmentRuleFiles = []
for rule, rule_data in armyRules.items():
    try:
        with open(rule_data["path"], "r", encoding="utf-8") as file:
            content = file.read()
            armyRuleFiles.append({rule:content})
    except FileNotFoundError:
        armyRuleFiles.append({rule:"file not found"})
            
for rule, rule_data in detachmentRules.items():
    try:
        with open(rule_data["path"], "r", encoding="utf-8") as file:
            content = file.read()
            detachmentRuleFiles.append({rule:content})
    except FileNotFoundError:
        detachmentRuleFiles.append({rule:"file not found"})
            
# abilityFiles: dict[str, str] -> ability key to file text.
abilityFiles = {}
for rule, info in armyAbilities.items():
    try:
        with open(info["path"], "r", encoding="utf-8") as file:
            content = file.read()
            abilityFiles[rule] = content
    except FileNotFoundError:
        abilityFiles[rule] = rule

@app.route("/", methods=["GET", "POST"])
def index():
    return render_template("index.html")

@app.route("/builder")
def builder():
    # Renders the builder page with all static/reference data and current state.
    return render_template(
        "builder.html",
        data=data,
        units=units,
        detachments=detachments,
        armyRuleFiles=armyRuleFiles,
        detachmentRuleFiles=detachmentRuleFiles,
        abilityFiles=abilityFiles,
        currentArmy = currentArmy,
        currentDetachment = currentDetachment
    )

@app.route("/api/add-unit", methods=["POST"])
def api_add_unit():
    global army

    # data: dict (request body), selected_unit_id: str | None
    data = request.get_json()
    selected_unit_id = data.get("unit")

    if selected_unit_id:
        unit_data = get_unit_by_id(selected_unit_id)
        if not unit_data:
            return jsonify({
                "success": False,
                "error": "Invalid unit",
                "army": build_army_for_ui()
            }), 400

        model_numbers = get_model_numbers_for_unit(unit_data)
        # assign a persistent unit number for this army entry
        global lastUnitNumber
        lastUnitNumber += 1
        army.append({
            "unit_id": selected_unit_id,
            "unit_number": lastUnitNumber,
            "model_numbers": model_numbers,
            "model_loadouts": get_default_model_loadouts(unit_data, model_numbers)
        })

    return jsonify({
        "success": True,
        "army": build_army_for_ui()
    })

@app.route("/api/select-weapons", methods=["POST"])
def select_weapons():
    global army

    # selected_unit_index: int | None, model_id: str | None
    data = request.get_json()
    selected_unit_index = data.get("unit_index")
    model_id = data.get("model_id")
    model_number = data.get("model_number")
    # selected_weapons: dict[str, str] | None
    selected_weapons = data.get("weapons")

    if not isinstance(selected_unit_index, int) or not (0 <= selected_unit_index < len(army)):
        return jsonify({
            "success": False,
            "error": "Invalid unit index",
            "army": build_army_for_ui()
        }), 400

    selected_unit = army[selected_unit_index]
    model_loadouts = selected_unit.setdefault("model_loadouts", {})
    model_numbers = selected_unit.get("model_numbers", {})
    valid_model_numbers = {
        str(number)
        for numbers in model_numbers.values()
        for number in numbers
    }
    model_number_key = str(model_number)

    if model_number is None or model_number_key not in valid_model_numbers:
        return jsonify({
            "success": False,
            "error": "Invalid model number",
            "army": build_army_for_ui()
        }), 400

    model_state = model_loadouts.setdefault(model_number_key, {"count": 1, "weapons": {}, "wargear": {}})
    model_state["weapons"] = selected_weapons if isinstance(selected_weapons, dict) else {}
    
    return jsonify({
        "success": True,
        "army": build_army_for_ui()
    })

@app.route("/api/select-wargear", methods=["POST"])
def select_wargear():
    global army

    # selected_unit_index: int | None, model_id: str | None
    data = request.get_json()
    selected_unit_index = data.get("unit_index")
    model_id = data.get("model_id")
    model_number = data.get("model_number")
    # selected_wargear: dict[str, str] | None
    selected_wargear = data.get("wargear")

    if not isinstance(selected_unit_index, int) or not (0 <= selected_unit_index < len(army)):
        return jsonify({
            "success": False,
            "error": "Invalid unit index",
            "army": build_army_for_ui()
        }), 400

    selected_unit = army[selected_unit_index]
    model_loadouts = selected_unit.setdefault("model_loadouts", {})
    model_numbers = selected_unit.get("model_numbers", {})
    valid_model_numbers = {
        str(number)
        for numbers in model_numbers.values()
        for number in numbers
    }
    model_number_key = str(model_number)

    if model_number is None or model_number_key not in valid_model_numbers:
        return jsonify({
            "success": False,
            "error": "Invalid model number",
            "army": build_army_for_ui()
        }), 400

    model_state = model_loadouts.setdefault(model_number_key, {"count": 1, "weapons": {}, "wargear": {}})
    model_state["wargear"] = selected_wargear if isinstance(selected_wargear, dict) else {}

    return jsonify({
        "success": True,
        "army": build_army_for_ui()
    })



@app.route("/api/army", methods=["GET"])
def api_army():
    return jsonify({
        "army": build_army_for_ui()
    })

@app.route("/api/remove-unit", methods=["POST"])
def api_remove_unit():
    global army

    # index: int | None -> unit position inside the in-memory army list.
    data = request.get_json()
    index = data.get("unit_index")

    # make sure index is valid
    if isinstance(index, int) and 0 <= index < len(army):
        army.pop(index)

    return jsonify({
        "success": True,
        "army": build_army_for_ui()
    })

@app.route("/api/reset", methods=["POST"])
def api_reset_army():
    global army
    global lastModelNumber
    global lastUnitNumber
    # Reset both runtime roster data and model number counter for a clean new army.
    army = []
    lastModelNumber = 0
    lastUnitNumber = 0

    return jsonify({
        "success": True,
        "army": build_army_for_ui()
    })

@app.route("/api/update-detachment", methods=["POST"])
def update_detachment():
    global detachments
    global currentDetachment

    # selected_detachment_id: str | None
    data = request.get_json()
    selected_detachment_id = data.get("detachment")
    # selectedDetachment: dict | None
    selectedDetachment = None

    for detachment in detachments:
        if detachment["id"] == selected_detachment_id:
            selectedDetachment = detachment
            break

    if not selectedDetachment:
        return jsonify({
            "success": False,
            "error": "Invalid detachment",
            "detachment": None
        }), 400

    currentDetachment = selectedDetachment


    return jsonify({
        "success": True,
        "detachment": selectedDetachment
    })

@app.route("/api/get-file-by-path", methods=["POST"])
def get_file_by_path():
    # file_path: str | None -> absolute/relative path provided by the frontend.
    file_path = request.get_json().get("path")

    try:
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read()
            return jsonify({
                "success": True,
                "content": content
            })
    except FileNotFoundError:
        return jsonify({
            "success": False,
            "content": "File not found"
        })

if __name__ == "__main__":
    app.run(debug=True)