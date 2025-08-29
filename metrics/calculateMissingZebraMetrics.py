"""
RealtimeMetrics — dérivation de métriques à chaque tick MotionWorks.

Utilisation :
-------------
engine = RealtimeMetrics()

for frame in flux_capteur:   # frame = dict avec keys: timestamp, entityId, x, y, speed, direction
    result = engine.update(frame)
    print(result)

Explication des métriques calculées :
-------------------------------------
- hi_dist_step : distance parcourue pendant cet intervalle *si* la vitesse >= HI_SPEED_TH.
- hi_dist_cum  : cumul de la distance HI depuis le début.
- sprintHit    : True si un sprint vient d'être détecté (entrée > seuil, durée mini respectée).
- sprint_count : nombre total de sprints détectés.
- codHit       : True si un virage net est détecté (vitesse angulaire ou accélération latérale).
- cod_count    : nombre total de COD détectés.
- impactHit    : True si une décélération/accélération très forte est détectée.
- impact_count : nombre total d'impacts détectés.

Notes :
- Unités : yards, yards/s, yards/s² (cohérent Zebra/NFL).
- Seuils calibrables dans la classe (valeurs NFL-like).
"""

import math
from typing import Dict

class RealtimeMetrics:
    # --- Seuils par défaut (peuvent être adaptés) ---
    HI_SPEED_TH = 6.56        # ~6 m/s en yd/s
    SPRINT_ENTER = 6.56
    SPRINT_EXIT_FRAC = 0.8
    SPRINT_MIN_DURATION_MS = 400
    SPRINT_COOLDOWN_MS = 1500
    COD_MIN_SPEED = 3.0
    COD_TURN_RATE = 90.0      # °/s
    COD_LAT_ACCEL = 2.0
    COD_COOLDOWN_MS = 600
    IMPACT_ACCEL_TH = 3.0
    IMPACT_COOLDOWN_MS = 800

    def __init__(self):
        # état interne par joueur
        self.state: Dict[str, dict] = {}

    def update(self, row: dict) -> dict:
        """
        row doit contenir : {'timestamp':ms, 'entityId':str, 'x':float, 'y':float, 'speed':float, 'direction':float}
        Retourne un dict avec les métriques calculées.
        """
        ts = int(row['timestamp'])
        pid = str(row['entityId'])
        x, y = float(row['x']), float(row['y'])
        speed = float(row.get('speed', 0.0))
        heading = float(row.get('direction', 0.0))

        st = self.state.get(pid, {
            'last_ts': None, 'last_x': None, 'last_y': None,
            'last_speed': None, 'last_heading': None,
            'sprint_count': 0, 'in_sprint': False, 'sprint_enter_ts': None, 'last_sprint_hit_ts': None,
            'cod_count': 0, 'last_cod_hit_ts': None,
            'impact_count': 0, 'last_impact_hit_ts': None,
            'hi_dist_cum': 0.0
        })

        # calcul dt
        dt = None
        if st['last_ts'] is not None:
            dt = max((ts - st['last_ts'])/1000.0, 1e-6)

        # acceleration + turn rate
        ax = ay = a = 0.0
        turn_rate = 0.0
        if dt and st['last_x'] is not None and st['last_y'] is not None:
            vx = (x - st['last_x']) / dt
            vy = (y - st['last_y']) / dt
            if st['last_speed'] is not None and st['last_heading'] is not None:
                vx_prev = st['last_speed'] * math.cos(math.radians(st['last_heading']))
                vy_prev = st['last_speed'] * math.sin(math.radians(st['last_heading']))
                ax = (vx - vx_prev) / dt
                ay = (vy - vy_prev) / dt
                a = math.hypot(ax, ay)
                turn_rate = (heading - st['last_heading']) / dt
        # ---------------- HI Distance -----------------
        hi_step = 0.0
        if dt and speed >= self.HI_SPEED_TH:
            hi_step = speed * dt
            st['hi_dist_cum'] += hi_step

        # ---------------- Sprint -----------------
        sprintHit = False
        if dt:
            enter = speed >= self.SPRINT_ENTER
            exit_thr = self.SPRINT_ENTER * self.SPRINT_EXIT_FRAC
            exit_ = speed < exit_thr
            if not st['in_sprint'] and enter:
                st['in_sprint'] = True
                st['sprint_enter_ts'] = ts
            elif st['in_sprint'] and exit_:
                dur = ts - (st['sprint_enter_ts'] or ts)
                cooldown_ok = (st['last_sprint_hit_ts'] is None) or (ts - st['last_sprint_hit_ts'] > self.SPRINT_COOLDOWN_MS)
                if dur >= self.SPRINT_MIN_DURATION_MS and cooldown_ok:
                    st['sprint_count'] += 1
                    st['last_sprint_hit_ts'] = ts
                    sprintHit = True
                st['in_sprint'] = False
                st['sprint_enter_ts'] = None

        # ---------------- COD -----------------
        codHit = False
        if dt and speed >= self.COD_MIN_SPEED:
            turn_ok = abs(turn_rate) >= self.COD_TURN_RATE
            lat_ok = abs(a) >= self.COD_LAT_ACCEL
            cooldown_ok = (st['last_cod_hit_ts'] is None) or (ts - st['last_cod_hit_ts'] > self.COD_COOLDOWN_MS)
            if (turn_ok or lat_ok) and cooldown_ok:
                st['cod_count'] += 1
                st['last_cod_hit_ts'] = ts
                codHit = True

        # ---------------- Impact -----------------
        impactHit = False
        if abs(a) >= self.IMPACT_ACCEL_TH:
            cooldown_ok = (st['last_impact_hit_ts'] is None) or (ts - st['last_impact_hit_ts'] > self.IMPACT_COOLDOWN_MS)
            if cooldown_ok:
                st['impact_count'] += 1
                st['last_impact_hit_ts'] = ts
                impactHit = True

        # mise à jour état
        st['last_ts'] = ts
        st['last_x'], st['last_y'] = x, y
        st['last_speed'], st['last_heading'] = speed, heading
        self.state[pid] = st

        # retourne les métriques du tick
        return {
            'timestamp': ts,
            'entityId': pid,
            'hi_dist_step': hi_step,
            'hi_dist_cum': st['hi_dist_cum'],
            'sprintHit': sprintHit,
            'sprint_count': st['sprint_count'],
            'codHit': codHit,
            'cod_count': st['cod_count'],
            'impactHit': impactHit,
            'impact_count': st['impact_count']
        }
