# Phisherman-ARES

A Microsoft Outlook extension for detecting phishing campagins within your mailbox. This extension is currently in development by the Advanced Research in Exploitation and Security (A.R.E.S) Lab under the Hack Pack orginazation. Feel free to report any bugs, issues, or feature requests here on Github.

## Services

We use the following services to determine whether emails qualify as phishing or contain malware:

- Hugging Face Transformers.js (local models)
- TensorFlow.js
- ClamAV
- URLhaus / PhishTank
- OpenPhish
- Spamhaus
- VirusTotal 

## Running the extension

For the development environment, it is important to have the physical app installed for the commands below:

#### Use localhost

If you prefer to configure a web server and host the add-in's web files from your computer, use the following steps.

1. Clone or download this sample to a folder on your computer. Then in a command prompt, bash shell, or **TERMINAL** in Visual Studio Code, navigate to the root of the sample folder.
1. Run the command `npm install`.
1. Run the command `npm start`.

    - If you've never developed an Office add-in on this computer before or it has been more than 30 days since you last did, you'll be prompted to delete an old security certificate and/or install a new one. Agree to both prompts.
    - After a few seconds, a webpack dev-server window will open and your files will be hosted there on localhost:3000.
    - When the server is successfully running, classic Outlook on Windows opens, and after a few seconds, a **Hello World** button appears on the Message tab of the ribbon in Message Compose mode. The add-in is also sideloaded to other supported Outlook clients, such as Outlook on the web and new Outlook on Windows.

1. [Test the sample on Outlook](#test-the-sample-on-outlook).

When you're finished working with the add-in, close Outlook. Then, in the window where you ran the npm commands, run `npm stop`.


#### Use localhost on MAC

If you prefer to configure a web server and host the add-in's web files from your computer, use the following steps.

1. Clone or download this repository.
1. From a command prompt, run the following commands.

    ```console
    npm install
    npm run start:xml
    ```

    - If you've never developed an Office add-in on this computer before or it has been more than 30 days since you last did, you'll be prompted to delete an old security certificate and/or install a new one. Agree to both prompts.
    - After a few seconds, a webpack dev-server window will open and your files will be hosted there on localhost:3000.
    - You'll receive errors about the add-in failing to sideload. Disregard these errors, as you'll manually sideload the add-in in the next step.

1. After starting the server, sideload the manifest by following the manual instructions in [Sideload Outlook add-ins for testing](https://learn.microsoft.com/office/dev/add-ins/outlook/sideload-outlook-add-ins-for-testing?tabs=xmlmanifest#sideload-manually).

    The **Hello World** button appears on the Message tab of the ribbon in Message Compose mode. The add-in is also sideloaded to other supported Outlook clients, such as Outlook on the web.

1. Follow the steps in [Try it out](#try-it-out) to test the sample.

When you're finished working with the add-in, in the window where you ran the npm commands, run `npm run stop:xml`. Then, [remove the sideloaded add-in](https://learn.microsoft.com/office/dev/add-ins/outlook/sideload-outlook-add-ins-for-testing?tabs=xmlmanifest#remove-a-sideloaded-add-in).


#### Opening the Add-On
For the web version, create a new message. Within the toolbar, you will see a squares made up of smaller squares. Hovering over it shows "Apps".
- Click the Icone, and get Add-ons. 
- Scroll to the bottom of popup window
- Click custom add-ons and add from file
- Select the "manifest.xml" (Not the manifest-localhost.xml)
- Close out of the window, and reclick the original apps icon

This allows the extension to be visible and ran. This only works while node is having a webpack runtime in the bakcground.

## Development

When is comes to development, it is crucial to note some important files. These files below are specifically for the node runtime or office extension compatability layer:
- manifest.xml
- manifest-local.xml
- manifest.json
- package.jsom
- webpack.config.js