#!/usr/bin/env sh
"\"",`$(echo --% ' |out-null)" >$null;function :{};function dv{<#${/*'>/dev/null )` 2>/dev/null;dv() { #>
echo "1.42.1"; : --% ' |out-null <#'; }; version="$(dv)"; deno="$HOME/.deno/$version/bin/deno"; if [ -x "$deno" ]; then  exec "$deno" run -q -A --no-lock "$0" "$@";  elif [ -f "$deno" ]; then  chmod +x "$deno" && exec "$deno" run -q -A --no-lock "$0" "$@";  fi; bin_dir="$HOME/.deno/$version/bin"; exe="$bin_dir/deno"; has () { command -v "$1" >/dev/null; } ;  if ! has unzip; then if ! has apt-get; then  has brew && brew install unzip; else  if [ "$(whoami)" = "root" ]; then  apt-get install unzip -y; elif has sudo; then  echo "Can I install unzip for you? (its required for this command to work) ";read ANSWER;echo;  if [ "$ANSWER" = "y" ] || [ "$ANSWER" = "yes" ] || [ "$ANSWER" = "Y" ]; then  sudo apt-get install unzip -y; fi; elif has doas; then  echo "Can I install unzip for you? (its required for this command to work) ";read ANSWER;echo;  if [ "$ANSWER" = "y" ] || [ "$ANSWER" = "yes" ] || [ "$ANSWER" = "Y" ]; then  doas apt-get install unzip -y; fi; fi;  fi;  fi;  if ! has unzip; then  echo ""; echo "So I couldn't find an 'unzip' command"; echo "And I tried to auto install it, but it seems that failed"; echo "(This script needs unzip and either curl or wget)"; echo "Please install the unzip command manually then re-run this script"; exit 1;  fi;  repo="denoland/deno"; if [ "$OS" = "Windows_NT" ]; then target="x86_64-pc-windows-msvc"; else :;  case $(uname -sm) in "Darwin x86_64") target="x86_64-apple-darwin" ;; "Darwin arm64") target="aarch64-apple-darwin" ;; "Linux aarch64") repo="LukeChannings/deno-arm64" target="linux-arm64" ;; "Linux armhf") echo "deno sadly doesn't support 32-bit ARM. Please check your hardware and possibly install a 64-bit operating system." exit 1 ;; *) target="x86_64-unknown-linux-gnu" ;; esac; fi; deno_uri="https://github.com/$repo/releases/download/v$version/deno-$target.zip"; exe="$bin_dir/deno"; if [ ! -d "$bin_dir" ]; then mkdir -p "$bin_dir"; fi;  if ! curl --fail --location --progress-bar --output "$exe.zip" "$deno_uri"; then if ! wget --output-document="$exe.zip" "$deno_uri"; then echo "Howdy! I looked for the 'curl' and for 'wget' commands but I didn't see either of them. Please install one of them, otherwise I have no way to install the missing deno version needed to run this code"; exit 1; fi; fi; unzip -d "$bin_dir" -o "$exe.zip"; chmod +x "$exe"; rm "$exe.zip"; exec "$deno" run -q -A --no-lock "$0" "$@"; #>}; $DenoInstall = "${HOME}/.deno/$(dv)"; $BinDir = "$DenoInstall/bin"; $DenoExe = "$BinDir/deno.exe"; if (-not(Test-Path -Path "$DenoExe" -PathType Leaf)) { $DenoZip = "$BinDir/deno.zip"; $DenoUri = "https://github.com/denoland/deno/releases/download/v$(dv)/deno-x86_64-pc-windows-msvc.zip";  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;  if (!(Test-Path $BinDir)) { New-Item $BinDir -ItemType Directory | Out-Null; };  Function Test-CommandExists { Param ($command); $oldPreference = $ErrorActionPreference; $ErrorActionPreference = "stop"; try {if(Get-Command "$command"){RETURN $true}} Catch {Write-Host "$command does not exist"; RETURN $false}; Finally {$ErrorActionPreference=$oldPreference}; };  if (Test-CommandExists curl) { curl -Lo $DenoZip $DenoUri; } else { curl.exe -Lo $DenoZip $DenoUri; };  if (Test-CommandExists curl) { tar xf $DenoZip -C $BinDir; } else { tar -Lo $DenoZip $DenoUri; };  Remove-Item $DenoZip;  $User = [EnvironmentVariableTarget]::User; $Path = [Environment]::GetEnvironmentVariable('Path', $User); if (!(";$Path;".ToLower() -like "*;$BinDir;*".ToLower())) { [Environment]::SetEnvironmentVariable('Path', "$Path;$BinDir", $User); $Env:Path += ";$BinDir"; } }; & "$DenoExe" run -q -A --no-lock "$PSCommandPath" @args; Exit $LastExitCode; <# 
# */0}`;

import { FileSystem, glob } from "https://deno.land/x/quickr@0.6.67/main/file_system.js"
import { Console, bold, lightRed, yellow } from "https://deno.land/x/quickr@0.6.67/main/console.js"
import { run, Timeout, Env, Cwd, Stdin, Stdout, Stderr, Out, Overwrite, AppendTo, throwIfFails, returnAsString, zipInto, mergeInto } from "https://deno.land/x/quickr@0.6.67/main/run.js"
import { indent } from "https://deno.land/x/good@1.7.1.1/flattened/indent.js"
import { compress, decompress } from "https://deno.land/x/zip@v1.2.5/mod.ts"

const escapeNixString = (string)=>{
    return `"${string.replace(/\$\{|[\\"]/g, '\\$&').replace(/\u0000/g, '\\0')}"`
}
const shellEscape = (arg)=>`${arg.replace(/'/g,`'"'"'`)}`

const argsWereGiven = Deno.args.length > 0

const defaultNixpkgsHash = "6d9c572be2b199be0456845a61d7e4b3e3ac6280"

const buildHelperFolder = `${FileSystem.thisFolder}/../build_helper`
const mainFile          = `${FileSystem.thisFolder}/../main.js`
const nixFilePath       = `${FileSystem.thisFolder}/../default.nix`
const lockFilePath      = `${FileSystem.thisFolder}/../flake.lock`
const fakeHome          = `${buildHelperFolder}/home`
const localTemp         = `${buildHelperFolder}/temp`
const nixFileTemplate   = `${buildHelperFolder}/default.nix`
const mainFileBundled   = `${buildHelperFolder}/main.bundle.js`
const readmeFilePath    = `${FileSystem.thisFolder}/../readme.md`
const readmeFileTemplate = `${buildHelperFolder}/readme.md`

import { build } from "https://deno.land/x/esbuild@v0.18.17/mod.js"
// import { BuildOptions } from "https://deno.land/x/esbuild@v0.18.17/mod.js"
import { denoPlugins } from "https://deno.land/x/esbuild_deno_loader@0.8.1/mod.ts"

function bundle({entryPoints, outputPath}) {
    return new Promise(async (resolve, reject)=>{
        build({
            bundle: true,
            entryPoints,
            jsxFactory: "h",
            format: "esm",
            plugins: [
                {
                    "name": "return-on-build",
                    "setup": (build) => {
                        build.onEnd((result) => {
                            if (result.errors.length > 0) {
                                reject(errors)
                            } else {
                                resolve(result)
                            }
                        })
                    },
                },
                ...denoPlugins()
            ],
            outfile: outputPath,
            external: [
            ]
        }).catch(reject)
    })
}

console.log(`bundling`)
await bundle({
    entryPoints: [ mainFile, ],
    outputPath: mainFileBundled,
})

// console.log(`created bundle; committing bundle`)
// var { success } = await run`git add -A`
// var { success } = await run`git commit -m 'build_for_nix'`
// console.log(`committing bundle`)

console.log(`injecting versions`)
const latestCommitHash = (await run`git rev-parse HEAD ${Stdout(returnAsString)}`).trim()

import {version} from "../tools/version.js"
await FileSystem.write({
    path: nixFilePath,
    data: `
    #
    #
    # DONT EDIT ME; EDIT ./build_helper/default.nix
    #
    #
    
    `.replace(
        /\n    /g, "\n"
    )+(
        await FileSystem.read(nixFileTemplate)
    ).replace(
        /REPLACEME_420492093/g, latestCommitHash
    ).replace(
        /REPLACEME_VERSION_9409841/g, escapeNixString(version)
    ).replace(
        /REPLACEME_NIXPKGS_HASH_9409841/g, defaultNixpkgsHash,
    )
})

await FileSystem.write({
    path: readmeFilePath,
    data: `
    <!--                                                          -->
    <!--                                                          -->
    <!-- DO NOT EDIT ME; EDIT ./build_helper/readme_workaround.md -->
    <!--                                                          -->
    <!--                                                          -->
    
    `.replace(/\n    /g, "\n")+(await FileSystem.read(readmeFileTemplate)).replace(/REPLACEME_420492093/g, latestCommitHash)
})

await run`nix --extra-experimental-features nix-command --extra-experimental-features flakes flake lock --update-input nixpkgs`


// 
// 
// get all the files locally for building
// 
// 
    console.log(`Downlaoding files`)
    let hashFromLockfile
    try {
        const lockFile = await FileSystem.read(lockFilePath)
        hashFromLockfile = JSON.parse(lockFile).nodes.nixpkgs.locked.rev
    } catch (error) {
        console.log(`Couldn't get the lock file for some reason.\n    Tried getting .nodes.nixpkgs.locked.rev of: ${JSON.stringify(lockFilePath)}`)
        Deno.exit(-1)
    }


    //
    // create the cached files
    //
    // await FileSystem.remove(fakeHome)
    await FileSystem.ensureIsFolder(localTemp)
    const denoCmd = (...args)=>run(
        `nix-shell`,
        `-I`,`nixpkgs=https://github.com/NixOS/nixpkgs/archive/${hashFromLockfile}.tar.gz`,
        `-p`, `deno`,
        `--run`, `${`deno ${args.map(shellEscape).join(" ")}`}`,
        Env({ HOME: fakeHome, NO_COLOR: "true", TMPDIR: localTemp, DENO_NO_UPDATE_CHECK: "true",}),
        Cwd(buildHelperFolder),
        Out(returnAsString),
    )
    const compileHelpString = await denoCmd("compile --no-lock --help")
    const architecturesString = compileHelpString.match(/--target <target>(?:\w|\W)+?\[possible values: (.+)\]/)
    if (!architecturesString) {
        throw Error(`
            
            So normally \`deno compile --help\` has a section like:
                
                --target <target>
                    Target OS architecture
                    
                    [possible values: x86_64-unknown-linux-gnu, aarch64-unknown-linux-gnu, x86_64-pc-windows-msvc, x86_64-apple-darwin, aarch64-apple-darwin]
            
            And I just parse out that^ to get the list of architectures. But that parsing failed.
            I'm using /--target <target>(\\w|\\W)+?\\[possible values: (.+)\\]/
            but the string was:\n${indent({ string: compileHelpString, by: "            ", noLead:false })}

        `)
    }
    const architectures = architecturesString[1].split(",").map(each=>each.trim())
    // build the cache for all the architectures
    // usually:
        // --target x86_64-unknown-linux-gnu
        // --target aarch64-unknown-linux-gnu
        // --target x86_64-pc-windows-msvc
        // --target x86_64-apple-darwin
        // --target aarch64-apple-darwin
    // await Promise.all(
    //     architectures.map(
    //         eachTarget=>denoCmd(`compile`, `--target`, eachTarget, mainFileBundled).then(()=>console.log(`compiled ${eachTarget}`))
    //     )
    // )
    console.log(`compiling...`)
    for (const eachTarget of architectures) {
        await denoCmd(`compile`, "--no-lock", `--target`, eachTarget, "--output", `./dummy.${eachTarget}`, "./dummy.js",).then(()=>console.log(`- compiled ${eachTarget}`))
    }

// console.log(`committing updated default.nix`)
// var { success } = await run`git add -A`
// var { success } = await run`git commit -m ${'update commit'}`

Deno.exit()
// (this comment is part of deno-guillotine, dont remove) #>