import React, { useState, useEffect } from 'react';
import {
	StyleSheet,
	Text,
	View,
	Platform,
	PermissionsAndroid,
	Alert,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps'; // Import MapView components

export default function App() {
	const [location, setLocation] = useState<any>(null);
	const [errorMsg, setErrorMsg] = useState<any>(null);
	const [targetLocation, setTargetLocation] = useState({
		// Example target location
		latitude: 45.4,
		longitude: 51.3,
		radius: 50, // Geofence radius in meters
	});
	const [isWithinGeofence, setIsWithinGeofence] = useState(false);

	useEffect(() => {
		(async () => {
			if (Platform.OS === 'android') {
				let { status } = await Location.requestForegroundPermissionsAsync();
				if (status !== 'granted') {
					setErrorMsg('Permission to access location was denied');
					return;
				}
			}

			let { status } = await Location.requestBackgroundPermissionsAsync();
			if (status !== 'granted') {
				setErrorMsg('Permission to access background location was denied');
				return;
			}

			let currentLocation = await Location.getCurrentPositionAsync({});
			setLocation(currentLocation.coords);

			// Start watching for location changes for geofencing
			const locationSubscription = await Location.watchPositionAsync(
				{ accuracy: Location.Accuracy.Balanced, distanceInterval: 10 }, // Adjust accuracy and interval as needed
				(newLocation) => {
					setLocation(newLocation.coords);
					checkGeofence(newLocation.coords);
				}
			);

			return () => locationSubscription.remove(); // Cleanup subscription on unmount
		})();
	}, []);

	const checkGeofence = (currentLocation: any) => {
		if (!targetLocation) return; // No target location set

		const distance = calculateDistance(
			currentLocation.latitude,
			currentLocation.longitude,
			targetLocation.latitude,
			targetLocation.longitude
		);

		setIsWithinGeofence(distance <= targetLocation.radius);
	};

	const calculateDistance = (
		lat1: number,
		lon1: number,
		lat2: number,
		lon2: number
	) => {
		// Haversine formula for calculating distance between two coordinates
		const R = 6371; // Radius of the earth in km
		const dLat = deg2rad(lat2 - lat1);
		const dLon = deg2rad(lon2 - lon1);
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(deg2rad(lat1)) *
				Math.cos(deg2rad(lat2)) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		const d = R * c * 1000; // Distance in meters
		return d;
	};

	const deg2rad = (deg: number) => {
		return deg * (Math.PI / 180);
	};

	let text = 'Waiting..';
	if (errorMsg) {
		text = errorMsg;
	} else if (location) {
		text = JSON.stringify(location);
	}

	return (
		<View style={styles.container}>
			<Text>{text}</Text>
			{location && (
				<MapView
					style={styles.map}
					initialRegion={{
						latitude: location.latitude,
						longitude: location.longitude,
						latitudeDelta: 0.005, // Adjust zoom level
						longitudeDelta: 0.005,
					}}
				>
					<Marker coordinate={location} title='Your Location' />
					{targetLocation && (
						<>
							<Marker
								coordinate={targetLocation}
								title='Target Location'
								pinColor='green'
							/>
							<Circle
								center={targetLocation}
								radius={targetLocation.radius}
								fillColor='rgba(0, 255, 0, 0.2)' // Semi-transparent green
								strokeColor='green'
							/>
						</>
					)}
				</MapView>
			)}
			<Text>Is within Geofence: {isWithinGeofence ? 'Yes' : 'No'}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	map: {
		width: '100%',
		height: 300,
	},
});
