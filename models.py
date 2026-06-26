class Army:
    def __init__(self, name):
        self.name = name   
        self.units = []
    
    def add_unit(self, unit):
        self.units.append(unit)
    
class Unit:
    def __init__(self, id, name):
        self.name = name
        self.id = id
