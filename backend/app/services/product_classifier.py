from __future__ import annotations

import re

from app.schemas.analysis import BOMComponent, ProductProfile


def classify_product(components: list[BOMComponent]) -> ProductProfile:
    has_motor = any(c.standard_name == "motor" for c in components)
    has_battery = any(c.standard_name == "battery_pack" for c in components)
    has_charger = any(c.standard_name == "charger" for c in components)
    has_derailleur = any(c.standard_name in ("derailleur_rear", "derailleur_front") for c in components)
    has_controller = any(c.standard_name == "motor_controller" for c in components)
    has_throttle = any(c.standard_name == "throttle" for c in components)
    has_display = any(c.standard_name == "display" for c in components)
    has_ebrake = any(c.standard_name == "ebrake_lever" for c in components)

    has_handbrake_front = any(c.standard_name == "handbrake_front" for c in components)
    has_handbrake_rear = any(c.standard_name == "handbrake_rear" for c in components)
    has_footbrake = any(c.standard_name == "footbrake" for c in components)
    has_brake_lever = any(c.standard_name == "brake_lever" for c in components)

    if has_handbrake_front or has_handbrake_rear or has_brake_lever or has_ebrake:
        if has_footbrake:
            brake_type = "both"
        else:
            brake_type = "hand"
    elif has_footbrake:
        brake_type = "foot"
    else:
        brake_type = "none"

    if has_derailleur:
        gear_type = "multi"
    else:
        gear_type = "single_speed"

    motor_power_w = None
    max_speed_mph = None
    for c in components:
        if c.standard_name == "motor":
            for spec in c.specifications:
                if spec.key == "power_w":
                    try:
                        motor_power_w = float(spec.value)
                    except (ValueError, TypeError):
                        pass
                elif spec.key == "max_speed_mph":
                    try:
                        max_speed_mph = float(spec.value)
                    except (ValueError, TypeError):
                        pass
            if motor_power_w is None and c.material:
                power_match = re.search(r'(\d+)\s*W', c.material)
                if power_match:
                    motor_power_w = float(power_match.group(1))
            if max_speed_mph is None and c.material:
                speed_match = re.search(r'(\d+)\s*[Kk]m', c.material)
                if speed_match:
                    max_speed_mph = round(float(speed_match.group(1)) / 1.609, 1)

    seat_height_mm = None
    seat_height_lowest_mm = None
    for c in components:
        if c.standard_name == "seat_post":
            for spec in c.specifications:
                if spec.key == "seat_height_mm":
                    try:
                        seat_height_mm = float(spec.value)
                    except (ValueError, TypeError):
                        pass
                elif spec.key == "seat_height_lowest_mm":
                    try:
                        seat_height_lowest_mm = float(spec.value)
                    except (ValueError, TypeError):
                        pass

    target_age_group = "adult"
    product_name = None
    for c in components:
        for orig in c.original_names:
            lower = orig.lower()
            if any(kw in lower for kw in ["kids", "children", "child", "儿童", "小孩"]):
                target_age_group = "children"
                break

    is_ebike = has_motor or has_battery or has_controller or has_throttle or has_ebrake

    if is_ebike:
        product_type = "E-bike"
    elif target_age_group == "children" or (seat_height_mm is not None and seat_height_mm <= 635):
        product_type = "Kids Bicycle"
    else:
        product_type = "Bicycle"

    is_sidewalk = seat_height_mm is not None and seat_height_mm <= 635
    is_small_sidewalk = seat_height_lowest_mm is not None and seat_height_lowest_mm < 560

    has_chain_guard = any(c.standard_name == "chain_guard" for c in components)

    has_coating = any(c.category in ("Frame", "Steering") for c in components)

    has_mouthable_plastic_parts = target_age_group == "children"

    battery_cell_count = None
    for c in components:
        if c.standard_name == "battery_pack":
            if c.material:
                cell_match = re.search(r'(\d+)\s*[颗颗PCSpcs]', c.material)
                if cell_match:
                    battery_cell_count = int(cell_match.group(1))

    has_bms_software = has_battery

    stem_type = None
    for c in components:
        if c.standard_name == "handlebar_stem":
            if c.material:
                if "有牙" in c.material or "quill" in c.material.lower():
                    stem_type = "quill"
                elif "无牙" in c.material or "threadless" in c.material.lower() or "ahead" in c.material.lower():
                    stem_type = "threadless"

    return ProductProfile(
        product_name=product_name,
        product_type=product_type,
        seat_height_mm=seat_height_mm,
        seat_height_lowest_mm=seat_height_lowest_mm,
        is_sidewalk=is_sidewalk,
        is_small_sidewalk=is_small_sidewalk,
        has_motor=has_motor or has_controller,
        motor_power_w=motor_power_w,
        max_speed_mph=max_speed_mph,
        has_battery=has_battery,
        has_charger=has_charger,
        brake_type=brake_type,
        gear_type=gear_type,
        target_age_group=target_age_group,
        has_derailleur=has_derailleur,
        has_chain_guard=has_chain_guard,
        has_coating=has_coating,
        has_mouthable_plastic_parts=has_mouthable_plastic_parts,
        battery_cell_count=battery_cell_count,
        has_bms_software=has_bms_software,
        stem_type=stem_type,
    )
