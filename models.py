def calculate_option_limit(option: dict, models: list) -> int:
    eligible_model_ids = option.get("eligible_models", [])
    eligible_count = sum(
        model.count
        for model in models
        if model.model_id in eligible_model_ids
    )
    limit = option.get("limit", {})
    limit_type = limit.get("type")

    if limit_type == "fixed":
        return limit.get("amount", 0)
    if limit_type == "per_model":
        return eligible_count * limit.get("amount", 1)
    if limit_type == "per_models":
        models_per_option = limit.get("models", 1)
        return (eligible_count // models_per_option) * limit.get("amount", 1)
    return 0


class Model:
    last_id = 0

    def __init__(
        self,
        model_name: str,
        model_id: str,
        stats: dict,
        count: int,
    ):
        self.model_name = model_name
        self.model_id = model_id
        self.stats = stats
        self.model_instance_id = 0
        self.count = count
        Model.last_id += 1
        self.model_instance_id = Model.last_id

    def to_dict(self):
        return {
            "model_name": self.model_name,
            "model_id": self.model_id,
            "stats": self.stats,
            "model_instance_id": self.model_instance_id,
            "count": self.count,
        }

class Unit:
    last_id = 0

    def __init__(
        self,
        unit_name: str,
        unit_id: str,
        weapons: list,
        wargear: list,
        weapon_groups: list | None = None,
        weapon_selections: dict | None = None,
        wargear_selections: dict | None = None,
    ):
        self.unit_name = unit_name
        self.unit_id = unit_id
        self.models = []
        self.weapons = weapons
        self.wargear = wargear
        self.weapon_groups = weapon_groups or []
        self.weapon_selections = weapon_selections or {}
        self.wargear_selections = wargear_selections or {}
        self.unit_instance_id = 0
        Unit.last_id += 1
        self.unit_instance_id = Unit.last_id

    def setWeapons(self, weapons: list):
        self.weapons = weapons

    def setWargear(self, wargear: list):
        self.wargear = wargear

    def getWeapons(self):
        return self.weapons

    def getWargear(self):
        return self.wargear

    def appendModel(self, model: Model):
        self.models.append(model)

    def getOptionsWithLimits(self, options: list, selections: dict) -> list:
        options_with_limits = []
        for option in options:
            option_with_limit = option.copy()
            option_with_limit["max"] = calculate_option_limit(option, self.models)
            option_id = option.get("weapon_id", option.get("wargear_id"))
            option_with_limit["selected"] = selections.get(option_id, 0)
            options_with_limits.append(option_with_limit)
        return options_with_limits

    def getWeaponSelection(self, option_id: str, group_id: str | None = None) -> int:
        if group_id:
            return self.weapon_selections.get(f"{group_id}:{option_id}", 0)
        return self.weapon_selections.get(option_id, 0)

    def getTotalWeaponSelection(self, option_id: str) -> int:
        grouped_total = sum(
            value
            for key, value in self.weapon_selections.items()
            if key.endswith(f":{option_id}")
        )
        return grouped_total or self.weapon_selections.get(option_id, 0)

    def validateSelections(self) -> list[str]:
        errors = []
        for option_type, options, selections in (
            ("weapon", self.weapons, self.weapon_selections),
            ("wargear", self.wargear, self.wargear_selections),
        ):
            for option in options:
                option_id = option.get("weapon_id", option.get("wargear_id"))
                selected = (
                    self.getTotalWeaponSelection(option_id)
                    if option_type == "weapon"
                    else selections.get(option_id, 0)
                )
                maximum = calculate_option_limit(option, self.models)
                if not isinstance(selected, int) or selected < 0 or selected > maximum:
                    errors.append(f"Invalid {option_type} selection for {option_id}")

        errors.extend(self.validateWeaponGroups())
        return errors

    def getWeaponGroupsWithLimits(self) -> list:
        weapons_by_id = {
            weapon["weapon_id"]: weapon
            for weapon in self.weapons
        }
        groups = []
        for group in self.weapon_groups:
            group_with_limit = group.copy()
            group_with_limit["max"] = calculate_option_limit(
                {
                    "eligible_models": group.get("eligible_models", []),
                    "limit": group.get("limit", {}),
                },
                self.models,
            )
            group_with_limit["options"] = []
            for option_id in group.get("options", []):
                option = weapons_by_id.get(option_id)
                if option is None:
                    continue
                option_with_selection = option.copy()
                option_with_selection["selection_key"] = f"{group['group_id']}:{option_id}"
                option_with_selection["selected"] = self.getWeaponSelection(option_id, group["group_id"])
                group_with_limit["options"].append(option_with_selection)
            groups.append(group_with_limit)
        return groups

    def validateWeaponGroups(self) -> list[str]:
        errors = []
        for group in self.weapon_groups:
            selected_count = sum(
                self.getWeaponSelection(option_id, group.get("group_id"))
                for option_id in group.get("options", [])
            )
            maximum = calculate_option_limit(
                {
                    "eligible_models": group.get("eligible_models", []),
                    "limit": group.get("limit", {}),
                },
                self.models,
            )
            if selected_count > maximum:
                errors.append(
                    f"Too many {group.get('group_name', 'weapon group')} selections: "
                    f"{selected_count} selected, {maximum} allowed"
                )

        return errors

    def getModels(self):
        return self.models

    def to_dict(self):
        return {
            "unit_name": self.unit_name,
            "unit_id": self.unit_id,
            "unit_instance_id": self.unit_instance_id,
            "weapons": self.getOptionsWithLimits(self.weapons, self.weapon_selections),
            "wargear": self.getOptionsWithLimits(self.wargear, self.wargear_selections),
            "weapon_groups": self.getWeaponGroupsWithLimits(),
            "models": [model.to_dict() for model in self.models],
        }
    
class Army:
    def __init__(self, army_name: str):
        self.army_name = army_name
        self.units = []
        self.detachments = []

    def appendUnit(self, unit: Unit):
        self.units.append(unit)

    def getUnits(self):
        return self.units

    def validate(self):
        errors = []
        for unit in self.units:
            unit_errors = unit.validateSelections()
            errors.extend(
                f"{unit.unit_name}: {error}"
                for error in unit_errors
            )
        return errors

    def to_dict(self):
        return {
            "army_name": self.army_name,
            "units": [unit.to_dict() for unit in self.units],
            "detachments": self.detachments,
        }