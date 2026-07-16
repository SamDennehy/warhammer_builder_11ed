class Model:
    last_id = 0

    def __init__(self, model_name: str, model_id: str, stats: dict):
        self.model_name = model_name
        self.model_id = model_id
        self.stats = stats
        self.model_instance_id = 0
        self.weapons = []
        self.wargear = []
        Model.last_id += 1
        self.model_instance_id = Model.last_id

    def setWeapons(self, weapons: list):
        self.weapons = weapons

    def setWargear(self, wargear: list):
        self.wargear = wargear

    def getWeapons(self):
        return self.weapons
    
    def getWargear(self):
        return self.wargear

    def to_dict(self):
        return {
            "model_name": self.model_name,
            "model_id": self.model_id,
            "stats": self.stats,
            "model_instance_id": self.model_instance_id,
            "weapons": self.weapons,
            "wargear": self.wargear,
        }

class Unit:
    last_id = 0

    def __init__(self, unit_name: str, unit_id: str):
        self.unit_name = unit_name
        self.unit_id = unit_id
        self.models = []
        self.unit_instance_id = 0
        Unit.last_id += 1
        self.unit_instance_id = Unit.last_id

    def appendModel(self, model: Model):
        self.models.append(model)

    def getModels(self):
        return self.models

    def to_dict(self):
        return {
            "unit_name": self.unit_name,
            "unit_id": self.unit_id,
            "unit_instance_id": self.unit_instance_id,
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

    def to_dict(self):
        return {
            "army_name": self.army_name,
            "units": [unit.to_dict() for unit in self.units],
            "detachments": self.detachments,
        }