from calculateMissingZebraMetrics import RealtimeMetrics

# Création de l'instance
engine = RealtimeMetrics()

# Exemple de données simulées
frames = [
    {'timestamp': 0, 'entityId': '1', 'x': 0, 'y': 0, 'speed': 7, 'direction': 0},
    {'timestamp': 500, 'entityId': '1', 'x': 3, 'y': 4, 'speed': 7, 'direction': 10},
    {'timestamp': 1000, 'entityId': '1', 'x': 6, 'y': 8, 'speed': 2, 'direction': 90},
    {'timestamp': 2000, 'entityId': '1', 'x': 10, 'y': 10, 'speed': 8, 'direction': 180},
]

# Test de la méthode update
for frame in frames:
    result = engine.update(frame)
    print(result)