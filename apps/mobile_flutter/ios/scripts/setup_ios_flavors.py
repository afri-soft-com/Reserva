#!/usr/bin/env python3
"""Duplique les configs Xcode Debug/Release/Profile en *-client / *-pro pour Flutter flavors."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PBX = ROOT / "Runner.xcodeproj" / "project.pbxproj"
SCHEMES = ROOT / "Runner.xcodeproj" / "xcshareddata" / "xcschemes"

IDS = {
    "proj_debug_client": "A10000000000000000000001",
    "proj_release_client": "A10000000000000000000002",
    "proj_profile_client": "A10000000000000000000003",
    "proj_debug_pro": "A10000000000000000000004",
    "proj_release_pro": "A10000000000000000000005",
    "proj_profile_pro": "A10000000000000000000006",
    "tgt_debug_client": "A10000000000000000000011",
    "tgt_release_client": "A10000000000000000000012",
    "tgt_profile_client": "A10000000000000000000013",
    "tgt_debug_pro": "A10000000000000000000014",
    "tgt_release_pro": "A10000000000000000000015",
    "tgt_profile_pro": "A10000000000000000000016",
    "test_debug_client": "A10000000000000000000021",
    "test_release_client": "A10000000000000000000022",
    "test_profile_client": "A10000000000000000000023",
    "test_debug_pro": "A10000000000000000000024",
    "test_release_pro": "A10000000000000000000025",
    "test_profile_pro": "A10000000000000000000026",
    "ref_debug_client": "A10000000000000000000031",
    "ref_release_client": "A10000000000000000000032",
    "ref_profile_client": "A10000000000000000000033",
    "ref_debug_pro": "A10000000000000000000034",
    "ref_release_pro": "A10000000000000000000035",
    "ref_profile_pro": "A10000000000000000000036",
}

PROJ_DEBUG = "97C147031CF9000F007C117D"
PROJ_RELEASE = "97C147041CF9000F007C117D"
PROJ_PROFILE = "249021D3217E4FDB00AE95B9"
TGT_DEBUG = "97C147061CF9000F007C117D"
TGT_RELEASE = "97C147071CF9000F007C117D"
TGT_PROFILE = "249021D4217E4FDB00AE95B9"
TEST_DEBUG = "331C8088294A63A400263BE5"
TEST_RELEASE = "331C8089294A63A400263BE5"
TEST_PROFILE = "331C808A294A63A400263BE5"


def extract_block(text: str, config_id: str) -> str:
    pattern = (
        r"\t\t"
        + config_id
        + r" /\* [^*]+ \*/ = \{\n\t\t\tisa = XCBuildConfiguration;.*?\n\t\t\};"
    )
    m = re.search(pattern, text, re.S)
    if not m:
        raise SystemExit(f"Config introuvable: {config_id}")
    return m.group(0)


def rename_config(block: str, new_id: str, new_name: str) -> str:
    # Remplace l'ID + commentaire de tête, puis le name =
    block = re.sub(
        r"^(\t\t)[A-F0-9]{24} /\* [^*]+ \*/",
        rf"\g<1>{new_id} /* {new_name} */",
        block,
        count=1,
        flags=re.M,
    )
    block = re.sub(r"name = [^;]+;", f"name = {new_name};", block)
    return block


def set_bundle(block: str, bundle: str, display: str) -> str:
    block = re.sub(
        r"PRODUCT_BUNDLE_IDENTIFIER = [^;]+;",
        f"PRODUCT_BUNDLE_IDENTIFIER = {bundle};",
        block,
    )
    if "INFOPLIST_KEY_CFBundleDisplayName" not in block:
        block = block.replace(
            'PRODUCT_NAME = "$(TARGET_NAME)";',
            'PRODUCT_NAME = "$(TARGET_NAME)";\n\t\t\t\tINFOPLIST_KEY_CFBundleDisplayName = "'
            + display
            + '";',
        )
    return block


def set_base_ref(block: str, ref_id: str, ref_name: str) -> str:
    return re.sub(
        r"baseConfigurationReference = [A-F0-9]{24} /\* [^*]+ \*/;",
        f"baseConfigurationReference = {ref_id} /* {ref_name} */;",
        block,
    )


def write_scheme(flavor: str, dbg: str, rel: str, prof: str) -> None:
    scheme = f"""<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1510"
   version = "1.3">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "97C146ED1CF9000F007C117D"
               BuildableName = "Runner.app"
               BlueprintName = "Runner"
               ReferencedContainer = "container:Runner.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "{dbg}"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      customLLDBInitFile = "$(SRCROOT)/Flutter/ephemeral/flutter_lldbinit"
      shouldUseLaunchSchemeArgsEnv = "YES">
      <MacroExpansion>
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "97C146ED1CF9000F007C117D"
            BuildableName = "Runner.app"
            BlueprintName = "Runner"
            ReferencedContainer = "container:Runner.xcodeproj">
         </BuildableReference>
      </MacroExpansion>
   </TestAction>
   <LaunchAction
      buildConfiguration = "{dbg}"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      customLLDBInitFile = "$(SRCROOT)/Flutter/ephemeral/flutter_lldbinit"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "97C146ED1CF9000F007C117D"
            BuildableName = "Runner.app"
            BlueprintName = "Runner"
            ReferencedContainer = "container:Runner.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "{prof}"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "97C146ED1CF9000F007C117D"
            BuildableName = "Runner.app"
            BlueprintName = "Runner"
            ReferencedContainer = "container:Runner.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "{dbg}">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "{rel}"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
"""
    (SCHEMES / f"{flavor}.xcscheme").write_text(scheme, encoding="utf-8")
    print(f"scheme {flavor}.xcscheme créé")


def main() -> None:
    text = PBX.read_text(encoding="utf-8")
    if "Debug-client" in text:
        print("Flavors déjà présents dans project.pbxproj")
        SCHEMES.mkdir(parents=True, exist_ok=True)
        write_scheme("client", "Debug-client", "Release-client", "Profile-client")
        write_scheme("pro", "Debug-pro", "Release-pro", "Profile-pro")
        return

    file_refs = f"""
		{IDS['ref_debug_client']} /* Debug-client.xcconfig */ = {{isa = PBXFileReference; lastKnownFileType = text.xcconfig; name = "Debug-client.xcconfig"; path = "Flutter/Debug-client.xcconfig"; sourceTree = "<group>"; }};
		{IDS['ref_release_client']} /* Release-client.xcconfig */ = {{isa = PBXFileReference; lastKnownFileType = text.xcconfig; name = "Release-client.xcconfig"; path = "Flutter/Release-client.xcconfig"; sourceTree = "<group>"; }};
		{IDS['ref_profile_client']} /* Profile-client.xcconfig */ = {{isa = PBXFileReference; lastKnownFileType = text.xcconfig; name = "Profile-client.xcconfig"; path = "Flutter/Profile-client.xcconfig"; sourceTree = "<group>"; }};
		{IDS['ref_debug_pro']} /* Debug-pro.xcconfig */ = {{isa = PBXFileReference; lastKnownFileType = text.xcconfig; name = "Debug-pro.xcconfig"; path = "Flutter/Debug-pro.xcconfig"; sourceTree = "<group>"; }};
		{IDS['ref_release_pro']} /* Release-pro.xcconfig */ = {{isa = PBXFileReference; lastKnownFileType = text.xcconfig; name = "Release-pro.xcconfig"; path = "Flutter/Release-pro.xcconfig"; sourceTree = "<group>"; }};
		{IDS['ref_profile_pro']} /* Profile-pro.xcconfig */ = {{isa = PBXFileReference; lastKnownFileType = text.xcconfig; name = "Profile-pro.xcconfig"; path = "Flutter/Profile-pro.xcconfig"; sourceTree = "<group>"; }};
"""
    text = text.replace(
        "/* End PBXFileReference section */",
        file_refs + "/* End PBXFileReference section */",
    )

    text = text.replace(
        "\t\t\t\t9740EEB21CF90195004384FC /* Debug.xcconfig */,\n"
        "\t\t\t\t7AFA3C8E1D35360C0083082E /* Release.xcconfig */,\n"
        "\t\t\t\t9740EEB31CF90195004384FC /* Generated.xcconfig */,",
        "\t\t\t\t9740EEB21CF90195004384FC /* Debug.xcconfig */,\n"
        "\t\t\t\t7AFA3C8E1D35360C0083082E /* Release.xcconfig */,\n"
        f"\t\t\t\t{IDS['ref_debug_client']} /* Debug-client.xcconfig */,\n"
        f"\t\t\t\t{IDS['ref_release_client']} /* Release-client.xcconfig */,\n"
        f"\t\t\t\t{IDS['ref_profile_client']} /* Profile-client.xcconfig */,\n"
        f"\t\t\t\t{IDS['ref_debug_pro']} /* Debug-pro.xcconfig */,\n"
        f"\t\t\t\t{IDS['ref_release_pro']} /* Release-pro.xcconfig */,\n"
        f"\t\t\t\t{IDS['ref_profile_pro']} /* Profile-pro.xcconfig */,\n"
        "\t\t\t\t9740EEB31CF90195004384FC /* Generated.xcconfig */,",
    )

    new_blocks: list[str] = []

    for flavor in ("client", "pro"):
        for base_id, base_name, key in (
            (PROJ_DEBUG, "Debug", "proj_debug"),
            (PROJ_RELEASE, "Release", "proj_release"),
            (PROJ_PROFILE, "Profile", "proj_profile"),
        ):
            block = extract_block(text, base_id)
            name = f"{base_name}-{flavor}"
            block = rename_config(block, IDS[f"{key}_{flavor}"], name)
            new_blocks.append(block)

    mapping = [
        (TGT_DEBUG, "Debug", "tgt_debug", "ref_debug", "Debug"),
        (TGT_RELEASE, "Release", "tgt_release", "ref_release", "Release"),
        (TGT_PROFILE, "Profile", "tgt_profile", "ref_profile", "Profile"),
    ]
    for flavor, bundle, display in (
        ("client", "com.reserva.client", "RESERVA"),
        ("pro", "com.reserva.pro", "RESERVA Pro"),
    ):
        for base_id, base_name, tgt_key, ref_key, xc_base in mapping:
            block = extract_block(text, base_id)
            name = f"{base_name}-{flavor}"
            block = rename_config(block, IDS[f"{tgt_key}_{flavor}"], name)
            block = set_bundle(block, bundle, display)
            ref_id = IDS[f"{ref_key}_{flavor}"]
            ref_name = f"{xc_base}-{flavor}.xcconfig"
            block = set_base_ref(block, ref_id, ref_name)
            new_blocks.append(block)

    for flavor in ("client", "pro"):
        for base_id, base_name, key in (
            (TEST_DEBUG, "Debug", "test_debug"),
            (TEST_RELEASE, "Release", "test_release"),
            (TEST_PROFILE, "Profile", "test_profile"),
        ):
            block = extract_block(text, base_id)
            name = f"{base_name}-{flavor}"
            block = rename_config(block, IDS[f"{key}_{flavor}"], name)
            block = re.sub(
                r"PRODUCT_BUNDLE_IDENTIFIER = [^;]+;",
                f"PRODUCT_BUNDLE_IDENTIFIER = com.reserva.{flavor}.RunnerTests;",
                block,
            )
            new_blocks.append(block)

    text = text.replace(
        "/* End XCBuildConfiguration section */",
        "\n".join(new_blocks) + "\n/* End XCBuildConfiguration section */",
    )

    def extend_list(marker_line: str, additions: list[str]) -> None:
        nonlocal text
        add = "".join(f"\t\t\t\t{a},\n" for a in additions)
        needle = f"\t\t\t\t{marker_line},\n\t\t\t);"
        if needle not in text:
            raise SystemExit(f"Liste configs introuvable (marker): {marker_line}")
        text = text.replace(
            needle,
            f"\t\t\t\t{marker_line},\n{add}\t\t\t);",
            1,
        )

    extend_list(
        "249021D3217E4FDB00AE95B9 /* Profile */",
        [
            f"{IDS['proj_debug_client']} /* Debug-client */",
            f"{IDS['proj_release_client']} /* Release-client */",
            f"{IDS['proj_profile_client']} /* Profile-client */",
            f"{IDS['proj_debug_pro']} /* Debug-pro */",
            f"{IDS['proj_release_pro']} /* Release-pro */",
            f"{IDS['proj_profile_pro']} /* Profile-pro */",
        ],
    )
    extend_list(
        "249021D4217E4FDB00AE95B9 /* Profile */",
        [
            f"{IDS['tgt_debug_client']} /* Debug-client */",
            f"{IDS['tgt_release_client']} /* Release-client */",
            f"{IDS['tgt_profile_client']} /* Profile-client */",
            f"{IDS['tgt_debug_pro']} /* Debug-pro */",
            f"{IDS['tgt_release_pro']} /* Release-pro */",
            f"{IDS['tgt_profile_pro']} /* Profile-pro */",
        ],
    )
    extend_list(
        "331C808A294A63A400263BE5 /* Profile */",
        [
            f"{IDS['test_debug_client']} /* Debug-client */",
            f"{IDS['test_release_client']} /* Release-client */",
            f"{IDS['test_profile_client']} /* Profile-client */",
            f"{IDS['test_debug_pro']} /* Debug-pro */",
            f"{IDS['test_release_pro']} /* Release-pro */",
            f"{IDS['test_profile_pro']} /* Profile-pro */",
        ],
    )

    text = text.replace(
        "PRODUCT_BUNDLE_IDENTIFIER = com.reserva.reserva;",
        "PRODUCT_BUNDLE_IDENTIFIER = com.reserva.client;",
    )
    text = text.replace(
        "PRODUCT_BUNDLE_IDENTIFIER = com.reserva.reserva.RunnerTests;",
        "PRODUCT_BUNDLE_IDENTIFIER = com.reserva.client.RunnerTests;",
    )

    PBX.write_text(text, encoding="utf-8")
    print("project.pbxproj mis à jour")

    SCHEMES.mkdir(parents=True, exist_ok=True)
    write_scheme("client", "Debug-client", "Release-client", "Profile-client")
    write_scheme("pro", "Debug-pro", "Release-pro", "Profile-pro")


if __name__ == "__main__":
    main()
