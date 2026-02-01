"""
Configuration reader utility for the VFS Slot Checker.
"""

import os
from configparser import ConfigParser
from typing import Dict, Optional

_config: Optional[ConfigParser] = None


def initialize_config(config_dir: str = "config") -> None:
    """
    Reads all INI configuration files in a directory and caches the result.
    Also reads user config from `VFS_CHECKER_CONFIG_PATH` env var (if set)

    Args:
        config_dir: The directory containing configuration files (default: "config").
    """
    global _config
    if not _config:
        _config = ConfigParser()
        
        # Get the directory where this file is located
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        full_config_dir = os.path.join(base_dir, config_dir)
        
        if os.path.exists(full_config_dir):
            for entry in os.scandir(full_config_dir):
                if entry.is_file() and entry.name.endswith(".ini"):
                    config_file_path = os.path.join(full_config_dir, entry.name)
                    _config.read(config_file_path)

    # Read user defined config file
    user_config_path = os.environ.get("VFS_CHECKER_CONFIG_PATH")
    if user_config_path and os.path.exists(user_config_path):
        _config.read(user_config_path)


def get_config_section(section: str, default: Optional[Dict] = None) -> Dict:
    """
    Get a configuration section as a dictionary.

    Args:
        section: The name of the section to retrieve.
        default: A dictionary containing default values for the section (optional).

    Returns:
        A dictionary containing the configuration for the specified section,
        or the provided default dictionary if the section is not found.
    """
    global _config
    if _config is None:
        initialize_config()
    
    if _config and _config.has_section(section):
        return dict(_config[section])
    else:
        return default or {}


def get_config_value(section: str, key: str, default: Optional[str] = None) -> Optional[str]:
    """
    Get a specific configuration value.

    Args:
        section: The name of the section containing the value.
        key: The name of the key to retrieve.
        default: The default value to return if the section or key is not found (optional).

    Returns:
        The value associated with the given key within the specified section,
        or the provided default value if the section or key does not exist.
    """
    global _config
    if _config is None:
        initialize_config()
    
    if _config and _config.has_section(section) and _config.has_option(section, key):
        return _config[section][key]
    else:
        return default


def set_config_value(section: str, key: str, value: str) -> None:
    """
    Set a specific configuration value at runtime.

    Args:
        section: The name of the section.
        key: The name of the key.
        value: The value to set.
    """
    global _config
    if _config is None:
        initialize_config()
    
    if _config:
        if not _config.has_section(section):
            _config.add_section(section)
        _config.set(section, key, value)
