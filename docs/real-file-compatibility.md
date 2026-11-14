# Real-file compatibility test reproduction

The public report describes tests on November 14, 2026 against source commit `495b5480fe841dc94ea4f184c4cc141bd4bd9b9d`. Results are for three individual third-party files. Source files and outputs are not redistributed here. Their download and redistribution terms are those of their original publishers. The camera test photo contains publicly available GPS data: handle the file as location-sensitive.

From the project root in PowerShell, with Node.js, npm and Chromium for Playwright installed:

```powershell
npm.cmd ci
npx.cmd playwright install chromium
New-Item -ItemType Directory -Force artifacts/real-file-compatibility | Out-Null
curl.exe -L --fail "https://raw.githubusercontent.com/comfyanonymous/ComfyUI_examples/f9431bb000ce792094ff345446e22cac1ea6cef3/hypernetworks/hypernetwork_example_output.png" -o artifacts/real-file-compatibility/comfy.png
curl.exe -L --fail -A "Metadata research (contact: support@aimetadataremover.pro)" "https://upload.wikimedia.org/wikipedia/commons/7/7c/ControlNet_Canny_Control_Weight_1.0.png" -o artifacts/real-file-compatibility/stable.png
curl.exe -L --fail "https://raw.githubusercontent.com/ianare/exif-samples/5332a9cf0220e9c6c93f88a187daa90808051e10/jpg/gps/DSCN0010.jpg" -o artifacts/real-file-compatibility/camera.jpg
node scripts/real-sample-run.mjs
```

The script checks source SHA-256 before processing and saves local output and detailed findings under `artifacts/real-file-compatibility`. It calls the project scanner, cleaner and verifier, compares PNG IDAT hashes, and compares Chromium-decoded RGBA pixel arrays. The camera image currently throws `unsupported_exif`: no output is generated. The script does not perform an independent ExifTool inspection; do that separately as below.

Independent verification used ExifTool 13.63 from commit `1da714924f67763b6a8a7013dd2aa1983a16f87b`. In a terminal where `exiftool` is installed, run:

```text
exiftool -G1 -a -s -Workflow -Prompt -Parameters artifacts/real-file-compatibility/comfy.png artifacts/real-file-compatibility/comfy-clean.png
exiftool -G1 -a -s -Workflow -Prompt -Parameters artifacts/real-file-compatibility/stable.png artifacts/real-file-compatibility/stable-clean.png
exiftool -G1 -a -s -GPS:all -Orientation -XMP:all artifacts/real-file-compatibility/camera.jpg
```

The PNG checks should find `Workflow` and `Prompt` only in the ComfyUI original and `Parameters` only in the Stable Diffusion original. ExifTool should find GPS and orientation in the camera input. Do not expect a cleaned camera output from this test. A browser UI test used local mocked billing, uploaded each exact file to its matching tool page, checked the downloaded PNG SHA-256 against the core output, and verified that the JPEG error appeared without a cleaned download. This does not test real billing or prove coverage beyond these files.
