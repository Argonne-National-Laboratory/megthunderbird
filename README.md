# megthunderbird
Client app for MEG. Not ready yet.

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
