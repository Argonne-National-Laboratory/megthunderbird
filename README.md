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

1. Make sure you're using Thunderbird 40 or above. At the moment this isn't in the Ubuntu repositories so you'll need to add a Thunderbird ppa.
   - `apt-add-repository ppa:mozillateam/thunderbird-next`
   - `sudo apt-get update`
   - `sudo apt-get upgrade`
2. Go to `/usr/lib/thunderbird/extensions`
3. Create a file called `grehm@ucdavis.edu` (it must match the `<em:id>` parameter from the install.rdf file in the megthunderbird extension.
   - Add a single line to this file with a path to the extension on disk, e.g.:
     `/home/username/Documents/Projects/megthunderbird/`
