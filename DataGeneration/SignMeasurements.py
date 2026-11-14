
import json
import hashlib
from eth_account import Account
from eth_account.messages import encode_defunct
from random import randint

private_keys = [
    "THE_PRIVATE_KEYS_HERE",
    "THE_PRIVATE_KEYS_HERE",
    "THE_PRIVATE_KEYS_HERE",
    "THE_PRIVATE_KEYS_HERE",
    "THE_PRIVATE_KEYS_HERE",
    "THE_PRIVATE_KEYS_HERE",
    "THE_PRIVATE_KEYS_HERE",
    "THE_PRIVATE_KEYS_HERE",
    "THE_PRIVATE_KEYS_HERE"
]

reports = [

    # 1. Particle Beam Parameters
    {
        "variables": {
            "beam_energy": 120,
            "beam_current": 87,
            "beam_intensity": 1520000000,
            "beam_power": 10,
            "beam_position_deviation": 1,
            "beam_size": 3,
            "beam_emittance": 12,
            "beam_energy_spread": 1,
            "beam_loss_rate": 2,
            "beam_stability": 99,
            "bunch_frequency": 400,
            "bunch_length": 25
        },
        "Unit": {
            "beam_energy": "GeV",
            "beam_current": "mA",
            "beam_intensity": "particles/s",
            "beam_power": "kW",
            "beam_position_deviation": "mm",
            "beam_size": "mm",
            "beam_emittance": "mm·mrad",
            "beam_energy_spread": "%",
            "beam_loss_rate": "%",
            "beam_stability": "%",
            "bunch_frequency": "MHz",
            "bunch_length": "ps"
        },
        "md": {
            "global": "Particle beam measurement report covering beam energy, intensity, spatial characteristics, stability and particle bunch parameters.",
            "beam_energy": "Average energy carried by accelerated particles.",
            "beam_intensity": "Number of particles passing through the measurement point per second.",
            "beam_position_deviation": "Deviation of the measured beam position from its reference trajectory.",
            "beam_emittance": "Measure of the transverse phase-space spread of the particle beam.",
            "beam_loss_rate": "Estimated percentage of particles lost during beam transport.",
            "beam_stability": "Estimated stability of beam parameters during operation."
        }
    },

    # 2. Accelerator Performance
    {
        "variables": {
            "accelerator_availability": 98,
            "accelerator_uptime": 97,
            "operating_cycles": 252,
            "successful_acceleration_cycles": 98,
            "average_acceleration_time": 11,
            "maximum_accelerator_energy": 150,
            "injection_efficiency": 95,
            "extraction_efficiency": 93,
            "beam_delivery_efficiency": 96,
            "unplanned_shutdowns": 2,
            "average_recovery_time": 32,
            "scheduled_maintenance_hours": 8
        },
        "Unit": {
            "accelerator_availability": "%",
            "accelerator_uptime": "%",
            "operating_cycles": "count",
            "successful_acceleration_cycles": "%",
            "average_acceleration_time": "seconds",
            "maximum_accelerator_energy": "GeV",
            "injection_efficiency": "%",
            "extraction_efficiency": "%",
            "beam_delivery_efficiency": "%",
            "unplanned_shutdowns": "count",
            "average_recovery_time": "minutes",
            "scheduled_maintenance_hours": "hours"
        },
        "md": {
            "global": "Accelerator operational performance report covering availability, acceleration cycles, beam delivery and equipment recovery.",
            "accelerator_availability": "Percentage of the reporting period during which the accelerator was available for operation.",
            "successful_acceleration_cycles": "Percentage of acceleration cycles completed successfully.",
            "injection_efficiency": "Percentage of injected particles successfully accepted into the accelerator.",
            "extraction_efficiency": "Percentage of particles successfully extracted from the accelerator.",
            "beam_delivery_efficiency": "Percentage of requested beam delivery achieved.",
            "average_recovery_time": "Average time required to restore operation after an unplanned interruption."
        }
    },

    # 3. Magnet and Electromagnetic Systems
    {
        "variables": {
            "dipole_magnet_current": 852,
            "quadrupole_magnet_current": 422,
            "magnet_temperature": 4,
            "magnetic_field_strength": 8,
            "magnetic_field_deviation": 1,
            "magnet_power_consumption": 122,
            "superconducting_magnet_quench_events": 1,
            "magnet_cooling_efficiency": 96,
            "magnet_alignment_deviation": 1
        },
        "Unit": {
            "dipole_magnet_current": "A",
            "quadrupole_magnet_current": "A",
            "magnet_temperature": "K",
            "magnetic_field_strength": "T",
            "magnetic_field_deviation": "%",
            "magnet_power_consumption": "kW",
            "superconducting_magnet_quench_events": "count",
            "magnet_cooling_efficiency": "%",
            "magnet_alignment_deviation": "mm"
        },
        "md": {
            "global": "Magnet system report covering electromagnetic field generation, magnet operating conditions, alignment and superconducting system performance.",
            "dipole_magnet_current": "Electrical current supplied to dipole magnets responsible for bending particle trajectories.",
            "quadrupole_magnet_current": "Electrical current supplied to quadrupole magnets responsible for focusing particle beams.",
            "magnetic_field_strength": "Measured magnetic flux density within the magnet system.",
            "superconducting_magnet_quench_events": "Number of events in which a superconducting magnet loses its superconducting state.",
            "magnet_alignment_deviation": "Deviation of magnet positioning from its reference alignment."
        }
    },

    # 4. Vacuum Systems
    {
        "variables": {
            "average_vacuum_pressure": 1,
            "maximum_vacuum_pressure": 2,
            "vacuum_pump_availability": 99,
            "vacuum_leak_events": 1,
            "vacuum_pump_power": 46,
            "residual_gas_density": 490,
            "vacuum_recovery_time": 18
        },
        "Unit": {
            "average_vacuum_pressure": "nPa",
            "maximum_vacuum_pressure": "nPa",
            "vacuum_pump_availability": "%",
            "vacuum_leak_events": "count",
            "vacuum_pump_power": "kW",
            "residual_gas_density": "particles/cm³",
            "vacuum_recovery_time": "minutes"
        },
        "md": {
            "global": "Accelerator vacuum system report covering beam pipe pressure, residual gas conditions, pumping infrastructure and vacuum integrity.",
            "average_vacuum_pressure": "Average pressure measured within the accelerator beam vacuum chamber.",
            "maximum_vacuum_pressure": "Highest pressure recorded within the monitored vacuum system.",
            "vacuum_leak_events": "Number of detected events indicating possible vacuum integrity loss.",
            "residual_gas_density": "Estimated density of residual gas molecules inside the beam vacuum chamber.",
            "vacuum_recovery_time": "Average time required to restore the target vacuum conditions."
        }
    },

    # 5. Radio Frequency Systems
    {
        "variables": {
            "rf_frequency": 400,
            "rf_cavity_voltage": 3,
            "rf_power_consumption": 255,
            "rf_amplitude_stability": 99,
            "rf_phase_stability": 1,
            "rf_cavity_temperature": 4,
            "rf_fault_events": 2,
            "rf_system_availability": 99,
            "accelerating_gradient": 16
        },
        "Unit": {
            "rf_frequency": "MHz",
            "rf_cavity_voltage": "MV",
            "rf_power_consumption": "kW",
            "rf_amplitude_stability": "%",
            "rf_phase_stability": "degrees",
            "rf_cavity_temperature": "K",
            "rf_fault_events": "count",
            "rf_system_availability": "%",
            "accelerating_gradient": "MV/m"
        },
        "md": {
            "global": "Radio frequency acceleration system report covering cavity operation, electromagnetic stability, energy transfer and system availability.",
            "rf_frequency": "Operating frequency of the radio frequency acceleration system.",
            "rf_cavity_voltage": "Voltage generated across the RF accelerating cavity.",
            "rf_amplitude_stability": "Stability of the amplitude of the accelerating RF field.",
            "rf_phase_stability": "Measured deviation of the RF phase from its reference value.",
            "accelerating_gradient": "Energy gain per unit length provided by the accelerating structure.",
            "rf_fault_events": "Number of detected RF system faults during the reporting period."
        }
    },

    # 6. Cooling and Thermal Systems
    {
        "variables": {
            "cooling_water_temperature": 18,
            "cooling_water_flow_rate": 255,
            "cooling_water_pressure": 5,
            "coolant_consumption": 120,
            "average_component_temperature": 33,
            "maximum_component_temperature": 49,
            "cryogenic_system_temperature": 4,
            "cryogenic_power_consumption": 182,
            "cooling_system_efficiency": 95,
            "cooling_system_failures": 1
        },
        "Unit": {
            "cooling_water_temperature": "°C",
            "cooling_water_flow_rate": "m³/h",
            "cooling_water_pressure": "bar",
            "coolant_consumption": "m³/day",
            "average_component_temperature": "°C",
            "maximum_component_temperature": "°C",
            "cryogenic_system_temperature": "K",
            "cryogenic_power_consumption": "kW",
            "cooling_system_efficiency": "%",
            "cooling_system_failures": "count"
        },
        "md": {
            "global": "Thermal management report covering conventional cooling circuits, cryogenic infrastructure and accelerator component temperatures.",
            "cooling_water_flow_rate": "Volume of cooling water circulating through the facility per hour.",
            "coolant_consumption": "Estimated total coolant consumption during a day.",
            "average_component_temperature": "Average temperature across monitored accelerator components.",
            "maximum_component_temperature": "Highest temperature recorded among monitored components.",
            "cryogenic_system_temperature": "Operating temperature of the cryogenic cooling infrastructure.",
            "cooling_system_efficiency": "Estimated effectiveness of the thermal management system."
        }
    },

    # 7. Radiation and Shielding
    {
        "variables": {
            "ambient_dose_rate": 5,
            "cumulative_radiation_dose": 125,
            "neutron_flux": 1520,
            "gamma_radiation_level": 3,
            "radiation_alarm_events": 0,
            "shielding_integrity": 99,
            "activated_components_count": 12,
            "radiation_monitor_availability": 99
        },
        "Unit": {
            "ambient_dose_rate": "µSv/h",
            "cumulative_radiation_dose": "µSv",
            "neutron_flux": "n/cm²/s",
            "gamma_radiation_level": "µSv/h",
            "radiation_alarm_events": "count",
            "shielding_integrity": "%",
            "activated_components_count": "count",
            "radiation_monitor_availability": "%"
        },
        "md": {
            "global": "Radiation monitoring report covering ambient dose rates, neutron and gamma radiation, shielding conditions and activated equipment.",
            "ambient_dose_rate": "Measured ambient radiation dose rate in monitored accelerator areas.",
            "cumulative_radiation_dose": "Accumulated radiation dose recorded by monitoring instrumentation.",
            "neutron_flux": "Number of neutrons crossing a unit surface area per second.",
            "radiation_alarm_events": "Number of radiation monitoring alarms triggered during the reporting period.",
            "activated_components_count": "Number of accelerator components identified as radioactively activated."
        }
    },

    # 8. Experimental and Detector Systems
    {
        "variables": {
            "detector_availability": 98,
            "detector_temperature": 20,
            "events_recorded": 12500,
            "total_experiment_events": 44050000,
            "data_acquisition_rate": 2,
            "detector_dead_time": 2,
            "detector_noise_level": 15,
            "data_quality_score": 98,
            "experiment_runtime": 19,
            "detector_fault_events": 1
        },
        "Unit": {
            "detector_availability": "%",
            "detector_temperature": "°C",
            "events_recorded": "events/s",
            "total_experiment_events": "count",
            "data_acquisition_rate": "GB/s",
            "detector_dead_time": "%",
            "detector_noise_level": "count/s",
            "data_quality_score": "%",
            "experiment_runtime": "hours",
            "detector_fault_events": "count"
        },
        "md": {
            "global": "Experimental instrumentation report covering detector availability, event acquisition, data quality and experimental runtime.",
            "events_recorded": "Number of detector events recorded per second.",
            "total_experiment_events": "Total number of recorded experimental events.",
            "data_acquisition_rate": "Rate at which detector data is collected by the acquisition infrastructure.",
            "detector_dead_time": "Percentage of time during which the detector is unable to record new events.",
            "detector_noise_level": "Rate of unwanted signals detected by the instrumentation.",
            "data_quality_score": "Estimated quality score of the collected experimental data."
        }
    },

    # 9. Energy and Environmental Impact
    {
        "variables": {
            "total_electrical_energy_consumption": 121,
            "average_power_demand": 5,
            "peak_power_demand": 8,
            "renewable_energy_percentage": 26,
            "electricity_per_beam_hour": 15,
            "carbon_emissions": 46,
            "water_consumption": 121,
            "waste_generated": 36,
            "energy_efficiency": 79
        },
        "Unit": {
            "total_electrical_energy_consumption": "MWh/day",
            "average_power_demand": "MW",
            "peak_power_demand": "MW",
            "renewable_energy_percentage": "%",
            "electricity_per_beam_hour": "MWh",
            "carbon_emissions": "tonnes CO2e/day",
            "water_consumption": "m³/day",
            "waste_generated": "kg/day",
            "energy_efficiency": "%"
        },
        "md": {
            "global": "Environmental and energy sustainability report covering electricity consumption, energy demand, renewable energy usage, emissions and resource consumption.",
            "total_electrical_energy_consumption": "Total electrical energy consumed by the accelerator facility per day.",
            "average_power_demand": "Average electrical power drawn by the facility.",
            "peak_power_demand": "Maximum electrical power demand recorded during the reporting period.",
            "renewable_energy_percentage": "Percentage of the facility's electricity supplied by renewable energy sources.",
            "electricity_per_beam_hour": "Electrical energy consumed for each hour of beam operation.",
            "carbon_emissions": "Estimated daily greenhouse gas emissions expressed as carbon dioxide equivalent."
        }
    }
]


def sign_data(data: dict, private_key_hex: str) -> tuple:
    canonical = json.dumps(
        data,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False
    )
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    key_hex = private_key_hex.strip()
    if key_hex.startswith(("0x", "0X")):
        key_hex = key_hex[2:]

    if len(key_hex) != 64:
        raise ValueError("Expected a 32-byte private key.")

    acct = Account.from_key(bytes.fromhex(key_hex))
    message = f"sha256:{digest}"
    signed = acct.sign_message(encode_defunct(text=message))

    output = dict(data)
    output["signature"] = signed.signature.hex()

    return output, digest


assert len(private_keys) == 9
assert len(reports) == 9

for i, (report, key) in enumerate(zip(reports, private_keys), start=1):

    signed_report, digest = sign_data(report, key)

    filename = f"{randint(0, 2**128)}_gateway_{i}_wave2_signed_report.json"

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(signed_report, f, indent=4, ensure_ascii=False)

    print(f"\nGateway {i} - Wave 2")
    print("File:", filename)
    print("SHA-256:", digest)
    print("Signature:", signed_report["signature"])

print("\nAll 9 second-wave reports generated successfully!")