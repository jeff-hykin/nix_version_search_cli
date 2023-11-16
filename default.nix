
#
#
# DONT EDIT ME; EDIT ./build_helper/default.nix
#
#

{
    # local install command: nix-env -i -f ./  
    pkgs ? (builtins.import 
        (builtins.fetchTarball
            ({url="https://github.com/NixOS/nixpkgs/archive/a7df6bc9d1a5621b3ec2750c82d3356c4fe88dbe.tar.gz";})
        )
        ({
            overlays = [ 
            ]; 
        })
    ),
    deno ? pkgs.deno,
    bash ? pkgs.bash,
}:
    pkgs.stdenv.mkDerivation (finalAttrs: {
        pname = "nvs";
        version = "0.2.0";
        
        dontPatchShebangs = 1;
        gcc = pkgs.gcc;
        coreutils = pkgs.coreutils;
        src = builtins.fetchTarball ({
            url="https://github.com/jeff-hykin/nix_version_search_cli/archive/e7e99430ad7a2c477939fb506cf92fcb61fd68dc.tar.gz";
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
            "$deno" compile --allow-all --output "$out/bin/nvsc" "$src/build_helper/bins/nvsc.js"
            "$deno" compile --allow-all --output "$out/bin/nvsg" "$src/build_helper/bins/nvsg.js"
            "$deno" compile --allow-all --output "$out/bin/nvsr" "$src/build_helper/bins/nvsr.js"
        '';
    })