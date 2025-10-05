# **ScanWizard: Product Locator with Customizable Distance Tracker**

## Overview

**ScanWizard** is a mobile application built using **React Native** and **Expo**. It serves as a product locator with a customizable distance tracker, designed to help users find products within a set radius. Whether you're a shopper looking for an item or a store manager tracking inventory, ScanWizard makes it easier to locate products in your vicinity with real-time distance updates.

## Features

* **Product Locator**: Allows users to search for products by scanning barcodes or QR codes.
* **Customizable Distance Tracker**: Set your preferred radius to track products within a specific distance.
* **Real-Time Location Updates**: Continuously update the product's location and distance from the user.
* **User-Friendly Interface**: Easy-to-navigate design ensuring a smooth user experience.
* **Store Integration**: Integrate product locations with nearby stores for easy access.

## Technologies Used

* **React Native**: Framework for building the mobile application.
* **Expo**: Toolset for React Native development, providing a smooth development experience and cross-platform support.
* **Geolocation API**: Used to fetch and track the user’s current location.
* **Barcode Scanner**: Integrates with the camera for barcode scanning to locate products.
* **Map View**: Display product and store locations using an interactive map.

## Installation Instructions

1. **Clone the Repository**
   Clone this repository to your local machine:

   ```bash
   git clone https://github.com/crazymix26/CapstoneProject.git
   ```

2. **Install Dependencies**
   Navigate to the project folder and install dependencies using `npm` or `yarn`:

   ```bash
   cd CapstoneProject
   npm install
   # or if you're using yarn
   yarn install
   ```

3. **Start the Application**
   Run the application in development mode:

   ```bash
   expo start
   ```

   This will open the Expo developer tools in your browser. You can scan the QR code using the **Expo Go** app on your mobile device to view the application on your phone, or run it on an emulator.

## Usage

* **Scanning Products**: Open the app and use the barcode scanner to locate a product. The app will fetch the product details and show its availability in nearby stores.
* **Customizing Distance**: You can set the preferred distance range from the settings page, allowing you to filter stores within that range.
* **Location Tracking**: As you move, the app will continuously update your location and show the distance from the product.


