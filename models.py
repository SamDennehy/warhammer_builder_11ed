class Model:
    last_id = 0

    model_name = ""
    model_id = ""
    model_instance_id = 0

    weapons = []
    wargear = []

    def __init__(self, model_name: str, model_id: str, stats: dict):
        self.model_name = model_name
        self.model_id = model_id
        self.stats = stats
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

class Unit:
    last_id = 0

    unit_name = ""
    unit_id = ""
    unit_instance_id = 0

    models = []

    def __init__(self, unit_name: str, unit_id: str):
        self.unit_name = unit_name
        self.unit_id = unit_id
        Unit.last_id += 1
        self.unit_instance_id = Unit.last_id

    def appendModel(self, model: Model):
        self.models.append(model)

    def getModels(self):
        return self.models
    
class Army:
    army_name = ""

    units = []
    detachments = []

    def __init__(self, army_name: str):
        self.army_name = army_name

    def appendUnit(self, unit: Unit):
        self.units.append(unit)

    def getUnits(self):
        return self.units