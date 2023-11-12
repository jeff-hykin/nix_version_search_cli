### How to install

Make sure you have nix installed:

```sh
curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install
```

Then install nvs:

```sh
nix-env -i -f https://github.com/jeff-hykin/nix_version_search_cli/archive/REPLACEME_420492093.tar.gz
```

### How to use

There's three commands:
- `nvsc` for nix code (for `shell.nix`, `default.nix`, or `flake.nix`)
- `nvsg` for global installs (e.g. `nix-env`)
- `nvsr` for interactive nix shells

If you want to use the "python" package in some nix code do:

```sh
➜ nvsc python@3

? Which Package [press enter immediately to select first, or start typing] › 
  python                : A high-level dynamically-typed programming language
  python-qt             : PythonQt is a dynamic Python binding for the Qt framework. It offers an easy way to embed the Python 
  python-full           : A high-level dynamically-typed programming language
  python2nix            : 
  pythonIRClib          : Python IRC library
  python-minimal        : A high-level dynamically-typed programming language
  python-launcher       : An implementation of the `py` command for Unix-based platforms
  mate.python-caja      : Python binding for Caja components
  ...
  
Selected: python

? Pick a version › 
  3.13.0a1
  3.12.0
  3.12.0rc3
  3.12.0rc2
  3.12.0b4
  3.12.0b3
  3.12.0b2
  3.12.0b1
  ...

Here's what to include in your nix code:

    yourVarName = (
      (import (builtins.fetchTarball {
          url = "https://github.com/NixOS/nixpkgs/archive/75a52265bda7fd25e06e3a67dee3f0354e73243c.tar.gz";
      }) {}).python312
    );

Run again with --explain if you're not sure how to use this^
```

