class Model:
    last_id = 0

    name = ""
    model_id = ""
    model_instance_id = 0

    weapons = []
    wargear = []

    def __init__(self, name: str, model_id: str, stats: dict):
        self.name = name
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

    name = ""
    unit_id = ""
    unit_instance_id = 0

    models = []

    def __init__(self, name: str, unit_id: str):
        self.name = name
        self.unit_id = unit_id
        Unit.last_id += 1
        self.unit_instance_id = Unit.last_id

    def addModel(self, model: Model):
        self.models.append(model)

    def getModels(self):
        return self.models
    
class Army:
    last_id = 0

    name = ""
    army_id = ""
    army_instance_id = 0

    units = []

    def __init__(self, name: str, army_id: str):
        self.name = name
        self.army_id = army_id
        Army.last_id += 1
        self.army_instance_id = Army.last_id

    def addUnit(self, unit: Unit):
        self.units.append(unit)

    def getUnits(self):
        return self.units