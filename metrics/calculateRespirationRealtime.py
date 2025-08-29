import numpy as np
from scipy import signal, interpolate

def br_instantane_realtime(rr_timestamps, rr_intervals, fs=4, window=10):
    """
    Estime la fréquence respiratoire à l'instant présent (temps réel).
    :param rr_timestamps: liste des timestamps (secondes)
    :param rr_intervals: liste des intervalles RR (secondes)
    :param fs: fréquence de rééchantillonnage (Hz)
    :param window: taille de la fenêtre en secondes
    :return: (timestamp_centre, br_value) -> timestamp centre de la fenêtre, BR estimé (br/min)
    """
    if len(rr_timestamps) < 2:
        return None, None
    now = rr_timestamps[-1]
    # On ignore le premier timestamp (0) qui n'a pas d'intervalle RR
    t_rr = np.array(rr_timestamps[1:])
    rr_vals = np.array(rr_intervals)
    # Sélectionne les données dans la fenêtre [now-window, now]
    idx = [i for i, t in enumerate(t_rr) if t >= now - window]
    if len(idx) < 2:
        return None, None
    t_win = t_rr[idx]
    rr_win = rr_vals[idx]
    # Rééchantillonnage
    t_uniform = np.arange(t_rr[0], t_rr[-1], 1/fs)
    interp_func = interpolate.interp1d(t_rr, rr_vals, kind='linear', fill_value="extrapolate")
    rr_resampled = interp_func(t_uniform)
    # Analyse spectrale
    if len(rr_resampled) < fs*window//2:
        return None, None
    seg_detrend = signal.detrend(rr_resampled)
    f, Pxx = signal.welch(seg_detrend, fs=fs, nperseg=min(256, len(rr_resampled)))
    mask = (f >= 0.1) & (f <= 0.5)
    if not np.any(mask):
        return None, None
    f_band = f[mask]
    P_band = Pxx[mask]
    f_resp = f_band[np.argmax(P_band)]
    return t_rr.mean(), f_resp * 60
