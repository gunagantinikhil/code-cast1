# CodeCast - Real-time Code Collaboration

CodeCast is a real-time code collaboration web application that allows multiple users to collaborate on code in the same virtual room. It's built using the MERN (MongoDB, Express.js, React, Node.js) stack and Socket.IO for real-time communication.

## Live Demo

You can try out CodeCast by visiting the [live demo](https://codecast-324z.onrender.com). Create or join a room and start collaborating with others in real time!
### DEMO VIDEO
https://github.com/Yadvendra016/CodeCast/assets/91756355/dadc9f09-ef24-4c73-aa43-223f7a817f9f

## Features

- Create or join a virtual "room" by entering a room ID.
- Set your username to identify yourself in the room.
- Real-time code collaboration with other users in the same room.
- Changes made by one user are instantly reflected on all connected clients.
- Code highlighting and editor customization options.

## Technologies Used

- Express.js: Handling API requests.
- React: Building the front-end interface.
- Node.js: Running the server.
- Socket.IO: Enabling real-time communication.
- uuid: Generating unique room IDs.
- CodeMirror: Providing the code editor.

## Usage

1. Open the [CodeCast live demo](https://codecast-324z.onrender.com).
2. Enter a Room ID or generate a new one.
3. Set your username.
4. Start collaborating with others in the same room.

## Development

If you want to run CodeCast locally or contribute to its development, follow these steps:

### Local Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/codecast.git
   cd codecast
   ```

2. Install dependencies for both server and client:

   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. Start the development servers:

   ```bash
   # Terminal 1 - Start the server
   cd server
   npm start

   # Terminal 2 - Start the client
   cd client
   npm start
   ```

### LAN Hosting (Network Access)

CodeCast supports LAN hosting, allowing devices on your local network to collaborate in real-time.

#### How to Enable LAN Access:

1. **Start the server** - The server automatically detects your LAN IP address:
   ```bash
   cd server
   npm start
   ```

   You'll see output like:
   ```
   🚀 Server is running on port 5000
   📍 Local access: http://localhost:5000
   🌐 LAN access: http://192.168.1.100:5000

   📱 Connect from other devices using: http://192.168.1.100:5000
   ```

2. **Start the client with LAN access:**
   ```bash
   cd client
   npm install  # Install cross-env if not already installed
   npm run start:lan
   ```
   
   This will start the React development server accessible from your network. You'll see a message showing your LAN IP address.

3. **Create environment file for client** (Optional but recommended):
   - Create a `.env` file in the `client` directory
   - Add: `REACT_APP_BACKEND_URL=http://YOUR_LAN_IP:5000` (replace with your detected LAN IP, e.g., `http://192.168.1.100:5000`)
   - This ensures the client connects to your server over the network

4. **Access from other devices:**
   - Make sure all devices are on the same network
   - Open a browser on another device and navigate to: `http://YOUR_LAN_IP:3000`
   - Example: `http://192.168.1.100:3000`

#### Firewall Configuration (Windows):

If other devices can't connect, you may need to allow Node.js through Windows Firewall:

1. Open Windows Security (Windows Defender Firewall)
2. Click "Allow an app through firewall"
3. Find Node.js or add it manually
4. Check both "Private" and "Public" networks
5. Click "OK"

#### Troubleshooting:

- **ENOTFOUND error or client won't start**: Run `npm install` in the client directory to install the required dependencies (cross-env)
- **404 Error on other devices**: Make sure you started the client with `npm run start:lan` (not just `npm start`)
- **Socket connection fails**: Check that the `.env` file in the client directory has the correct server IP
- **Can't detect LAN IP**: Make sure your device is connected to a local network (WiFi or Ethernet)
- **Connection refused**: Check Windows Firewall settings for ports 3000 and 5000
- **Timeout errors**: Ensure all devices are on the same network
- **CORS errors**: The server now automatically allows local network connections

#### Example Use Cases:

- Collaborate with teammates on the same office network
- Pair programming with someone in the same room
- Remote classroom coding sessions on campus WiFi
- Testing on multiple devices simultaneously
