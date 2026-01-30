# ShadeRoute: Privacy-Focused Route Planner

![ShadeRoute Logo](public/vite.svg)

**ShadeRoute** is a privacy-conscious web application designed to help users find optimal routes while minimizing exposure to surveillance cameras. By leveraging OpenStreetMap data and camera location databases, ShadeRoute calculates routes that prioritize areas with fewer surveillance points, offering a "stealth mode" for those concerned about privacy.

## Features

*   **Privacy-Optimized Routing**: Calculate routes that avoid known surveillance camera locations.
*   **Multiple Routing Engines**: Choose between GraphHopper (with custom models) or OpenRouteService for route calculation.
*   **Stealth Level Settings**: Adjust your privacy preference with options for Speed, Balanced, or Stealth modes.
*   **Real-Time Camera Detection**: Automatically scan for surveillance cameras along your route.
*   **Stealth Score**: Receive a numerical score (0-100) indicating the privacy level of your chosen route.
*   **API Key Management**: Securely store and manage API keys for routing services (GraphHopper, OpenRouteService).
*   **Visual Map Interface**: Interactive map with camera markers and route overlays.
*   **Turn-by-Turn Directions**: Detailed navigation instructions for your privacy-optimized path.
*   **Route Comparison**: View and compare your stealth route against the fastest possible route.

## Technologies Used

*   **Frontend Framework**: React 19 with TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS
*   **Mapping Library**: Leaflet.js with react-leaflet
*   **APIs**:
    *   OpenStreetMap Nominatim (for geocoding)
    *   OpenStreetMap Overpass API (for camera data)
    *   GraphHopper (for routing with custom models)
    *   OpenRouteService (for routing)
*   **Testing**: Vitest, ESLint, and TypeScript for robust code quality.
*   **Analytics**: Vercel Analytics (for anonymous usage insights)

## How It Works

1.  **Input**: Enter your start and end locations using the search bar.
2.  **Scanning**: ShadeRoute automatically scans the area between your points for known surveillance cameras using the Overpass API.
3.  **Calculation**: Based on your selected Stealth Level (Speed, Balanced, Stealth), the application calculates a route.
    *   **Speed**: Finds the fastest route (ignores cameras).
    *   **Balanced**: A compromise between speed and avoiding high-density camera areas.
    *   **Stealth**: Aggressively avoids all camera zones, even if it means taking a significantly longer route.
4.  **Visualization**: Your privacy-optimized route is displayed on the map in blue, while the fastest route (for comparison) is shown in gray. Cameras are marked as red dots.
5.  **Insights**: A detailed stats panel shows your route's "Stealth Score," the number of cameras encountered, distance, time, and a comparison to the fastest route.

## Getting Started

1.  **Prerequisites**: Ensure you have Node.js (v20.19.0 or higher) installed.
2.  **Clone the Repository**:
    ```bash
    git clone https://github.com/tomwolfe/shaderoute.git
    cd shaderoute
    ```
3.  **Install Dependencies**:
    ```bash
    npm install
    ```
4.  **Start the Development Server**:
    ```bash
    npm run dev
    ```
5.  **Open your browser** and navigate to `http://localhost:5173` to use the application.

## Usage

1.  **Enter Locations**: Use the "START" and "DESTINATION" search fields to input your locations.
2.  **Configure Settings**:
    *   Select your preferred routing engine (GraphHopper or OpenRouteService).
    *   Enter your API keys if you have them (required for optimal performance).
    *   Choose your desired Stealth Level.
    *   Toggle the "Fastest Route" display to compare routes.
3.  **Calculate Route**: Click the "Calculate" button to find your privacy-optimized path.
4.  **Review Results**: Examine the map, your Stealth Score, and the turn-by-turn directions.

## API Keys

For full functionality, you'll need API keys from the routing services:

*   **GraphHopper**: [https://graphhopper.com/](https://graphhopper.com/)
*   **OpenRouteService**: [https://openrouteservice.org/](https://openrouteservice.org/)

You can enter these keys in the Settings panel. You can choose to store them only for your current session or persist them in your browser's local storage.

## Privacy Note

ShadeRoute is designed with privacy in mind. It does not track your location or route history. Your search queries and API keys are stored only on your device. The application relies on publicly available OpenStreetMap data.

## License

This project is licensed under the MIT License. See the [LICENSE.md](LICENSE.md) file for details.
