
<!--                                                          -->
<!--                                                          -->
<!-- DO NOT EDIT ME; EDIT ./build_helper/readme_workaround.md -->
<!--                                                          -->
<!--                                                          -->

## What is this?

A CLI tool for finding/using versions of nix packages!

<img src="/docs/nvs_updated.gif" alt="cli command usage with dynamic responses">

## How to install

Make sure you have nix installed:

```sh
curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install
```

Then install nvs:

```sh
nix-env -i -f https://github.com/jeff-hykin/nix_version_search_cli/archive/db0b0231106fa0b4e026be9eb991c3ed1ff98af8.tar.gz
# or, if you have flakes:
nix profile install 'https://github.com/jeff-hykin/nix_version_search_cli/archive/db0b0231106fa0b4e026be9eb991c3ed1ff98af8.tar.gz#nvs'
```

## How to use

There's one command with a few usages:
- `nvs --install <nameOfSomething>` works like `apt-get install`/`brew install`. After you select a version, it will get system installed.
- `nvs --dry-install <nameOfSomething>` show the nix command (if you want to run it yourself)
- `nvs <nameOfSomething>` will give copy-pastable code for a `shell.nix`, `default.nix`, or `flake.nix` file.
- `nvs --repl <nameOfSomething>` give copy-pastable code for accessing the package anywhere in nix (e.g. after running `nix repl`)
- `nvs --shell <nameOfSomething>` if you want want the command for an interactive nix shell that has the package 

## Example

If you want to use the "python" package in some nix code do:

```sh
➜ nvs python@3

? Which Package [type OR press enter OR use arrows] › 
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

Here is what to include in your nix code:

    python = (
      (import (builtins.fetchTarball {
          url = "https://github.com/NixOS/nixpkgs/archive/75a52265bda7fd25e06e3a67dee3f0354e73243c.tar.gz";
      }) {}).python312
    );

If you are not sure how to use this^
Run: nvs --explain python@3
```

