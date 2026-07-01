def undo_existing_corrections(connections, inversions, displayed_angles):
    """
    connections: dict like {'I1': 'I3', 'I2': 'I1', 'I3': 'I2'}
                 key = software channel, value = physical terminal feeding it
    inversions:  dict like {'I1': True, 'I2': False, 'I3': True}
    displayed_angles: dict like {'I1': 231.7, 'I2': 170.9, 'I3': -69.8}
    
    returns: dict of raw physical terminal angles
             like {'I1': ..., 'I2': ..., 'I3': ...}
    """
    raw_physical = {}
    
    for software_ch, angle in displayed_angles.items():
        physical_terminal = connections[software_ch]  # look it up from connections
        was_inverted = inversions[software_ch]        # look it up from inversions
        
        if was_inverted:
            angle = wrap_abs(angle + 180)
        
        raw_physical[physical_terminal] = angle
    
    return raw_physical

def wrap_abs(angle):
    """
    Normalizes angle inversion by ensuring that values stay within 0 - 360 degrees
    """
    norm_ang = angle

    while norm_ang > 360 or norm_ang < 0:
        if norm_ang < 0:
            norm_ang += 360
        elif norm_ang >= 360:
            norm_ang -= 360

    return norm_ang

    # 0   + 180 = 180 ok
    # 120 + 180 = 300 ok
    # 240 + 180 = 400 wrong

def wrap_diff(angle):
    diff_ang = angle

    while diff_ang > 180 or diff_ang < -180:
        if diff_ang < -180:
            diff_ang += 360
        elif diff_ang >= 180:
            diff_ang -= 360

    return diff_ang


    