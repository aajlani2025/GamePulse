from calculateRespirationRealtime import br_instantane_realtime
import numpy as np

# Simule des timestamps et intervalles RR en temps réel
rr_timestamps = np.cumsum([0, 1.0, 1.0, 0.8, 1.2, 1.0, 0.9, 1.1, 1.0, 1.0, 1.2, 0.8, 1.0, 1.0])
rr_intervals = [1.0, 1.0, 0.8, 1.2, 1.0, 0.9, 1.1, 1.0, 1.0, 1.2, 0.8, 1.0, 1.0]

# On simule l'arrivée des données une par une
for i in range(2, len(rr_timestamps)):
    ts = rr_timestamps[:i]
    rr = rr_intervals[:i-1]
    t_centre, br = br_instantane_realtime(ts, rr, window=5)
    if br is not None:
        print(f"{t_centre:.1f}s → {br:.1f} br/min")
    else:
        print(f"{ts[-1]:.1f}s → pas assez de données")
