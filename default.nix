#
#
# DONT EDIT ME; EDIT ./build_helper/default.nix
#
#

{
  # local install command: nix-env -i -f ./  
  pkgs ? (builtins.import
    (builtins.fetchTarball
      ({ url = "https://github.com/NixOS/nixpkgs/archive/a7df6bc9d1a5621b3ec2750c82d3356c4fe88dbe.tar.gz"; })
    )
    ({
      overlays = [
      ];
    })
  )
, deno ? pkgs.deno
, bash ? pkgs.bash
,
}:
pkgs.stdenv.mkDerivation {
  pname = "nvs";
  version = "0.1.0";

  dontPatchShebangs = 1;
  gcc = pkgs.gcc;
  coreutils = pkgs.coreutils;
  src = builtins.fetchTarball ({
    url = "https://github.com/jeff-hykin/nix_version_search_cli/archive/09c50c09060cd1c070611568ac8fa713c72f5a2a.tar.gz";
  });

  buildInputs = [
    deno
    bash
  ];

  # separateDebugInfo = true;
  # We override the install phase, as the emojify project doesn't use make
  installPhase = ''
    # 
    # imports
    # 
    deno="${deno}/bin/deno"  # TODO: it would be best to shell-escape these before interpolating
            
    export HOME="$out/temp_home"
            
    # 
    # commands
    # 
    mkdir -p "$out/bin"
    "$deno" compile --allow-env --allow-net "$src/build_helper/bins/nvsc.js" --output "$out/bin/nvsc"
    "$deno" compile --allow-env --allow-net "$src/build_helper/bins/nvsg.js" --output "$out/bin/nvsg"
    "$deno" compile --allow-env --allow-net "$src/build_helper/bins/nvsr.js" --output "$out/bin/nvsr"
  '';
}
