# megthunderbird
Client app for MEG. Not ready yet.

## Usage
### Scanning a Key
If your phone does not have symmetric key information for the client then you will
need to scan a QR code in the client.

Steps:
1. Go to write window in Thunderbird
2. Click button to encrypt your emails with MEG.
3. Enter a recipient address and then click send.
4. Scan the QR code with your phone
5. Click the `CLICK ME` button below the QR code to save the QR to the client.

If the steps above were messed up somehow then you can revoke the client key and
start from the beginning of the process.

### Revoking a client key
This is a debugging feature right now. Click on `Write`. Then click
`DEBUG: Remove Client Symmetric Key` at the top right of the screen.

## Installation instructions

### For Developers

#### Linux

1. Download the xpi file here: https://github.com/Argonne-National-Laboratory/megthunderbird/releases/download/1.0a/megthunderbird.anl.gov.xpi
2. In thunderbird, go to Tools->Add-ons then click the gear menu and choose `Install Add-on From File...`
3. Find the file you downloaded in step 1.
4. Restart Thunderbird

