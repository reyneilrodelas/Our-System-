// import React, { useState, useEffect } from 'react';
// import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
// import { Checkbox } from 'react-native-paper';  // Import from react-native-paper
// import { createClient } from '@supabase/supabase-js';

// export default function AddStoreScreen() {
//     const [storeName, setStoreName] = useState('');
//     const [storeAddress, setStoreAddress] = useState('');
//     const [latitude, setLatitude] = useState('');
//     const [longitude, setLongitude] = useState('');
//     const [productList, setProductList] = useState<{ barcode: string; name: string }[]>([]);
//     const [selectedProducts, setSelectedProducts] = useState<string[]>([]); // Track multiple selected products
//     const [message, setMessage] = useState('');
//     const [storeId, setStoreId] = useState(null);

//     const supabaseUrl = 'https://mybjttehecduzulururb.supabase.co';
//     const supabaseKey =
//         'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15Ymp0dGVoZWNkdXp1bHVydXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1NTEyMzEsImV4cCI6MjA2ODEyNzIzMX0.JxyU7I54qAWoQBillFtpm-GaMzAaDc3oPj9iZUQwd08';
//     const supabase = createClient(supabaseUrl, supabaseKey);

//     useEffect(() => {
//         const fetchProducts = async () => {
//             const { data, error } = await supabase.from('products').select('barcode, name');
//             if (error) {
//                 console.error('Error fetching products:', error);
//                 setMessage('Error fetching products');
//             } else {
//                 setProductList(data);
//             }
//         };

//         fetchProducts();
//     }, []);

//     const handleStoreSubmit = async () => {
//         try {
//             if (!storeName || !storeAddress || !latitude || !longitude) {
//                 setMessage('Please fill out all store fields.');
//                 return;
//             }

//             if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
//                 setMessage('Please enter valid numeric values for latitude and longitude.');
//                 return;
//             }

//             const { data, error } = await supabase
//                 .from('stores')
//                 .insert([{
//                     name: storeName,
//                     address: storeAddress,
//                     latitude: parseFloat(latitude),
//                     longitude: parseFloat(longitude),
//                 }])
//                 .select()
//                 .single();

//             if (error) {
//                 setMessage('Error: ' + (error.message || error));
//                 return;
//             }

//             setStoreId(data?.id);
//             setMessage('Store added successfully!');
//         } catch (error) {
//             console.error('Error occurred during store creation:', error);
//             setMessage('An unknown error occurred.');
//         }
//     };

//     const handleAssignProduct = async () => {
//         try {
//             if (selectedProducts.length === 0 || !storeId) {
//                 setMessage('Please select at least one product to assign.');
//                 return;
//             }

//             for (const barcode of selectedProducts) {
//                 const { error } = await supabase.from('store_products').insert([{
//                     store_id: storeId,
//                     product_barcode: barcode,
//                 }]);


//                 if (error) {
//                     console.error('Error assigning product to store:', error);
//                     setMessage('Error: ' + (error.message || error));
//                     return;
//                 }
//             }

//             setMessage('Products assigned to store successfully!');
//         } catch (error) {
//             console.error('Error occurred during product assignment:', error);
//             setMessage('An unknown error occurred.');
//         }
//     };

//     return (
//         <View style={styles.container}>
//             <Text style={styles.text}>Add Store Screen</Text>

//             {/* Store Creation Form */}
//             <TextInput
//                 style={styles.input}
//                 placeholder="Store Name"
//                 value={storeName}
//                 onChangeText={setStoreName}
//             />
//             <TextInput
//                 style={styles.input}
//                 placeholder="Store Address"
//                 value={storeAddress}
//                 onChangeText={setStoreAddress}
//             />
//             <TextInput
//                 style={styles.input}
//                 placeholder="Latitude"
//                 keyboardType="numeric"
//                 value={latitude}
//                 onChangeText={setLatitude}
//             />
//             <TextInput
//                 style={styles.input}
//                 placeholder="Longitude"
//                 keyboardType="numeric"
//                 value={longitude}
//                 onChangeText={setLongitude}
//             />

//             <Button title="Create Store" onPress={handleStoreSubmit} />

//             {/* Product Assignment Form */}
//             {storeId && (
//                 <View style={styles.productContainer}>
//                     <Text style={styles.text}>Assign Products to Store</Text>
//                     {productList.map((product) => (
//                         <View key={product.barcode} style={styles.checkboxContainer}>
//                             <Checkbox
//                                 status={selectedProducts.includes(product.barcode) ? 'checked' : 'unchecked'}
//                                 onPress={() => {
//                                     if (selectedProducts.includes(product.barcode)) {
//                                         setSelectedProducts(selectedProducts.filter((item) => item !== product.barcode));
//                                     } else {
//                                         setSelectedProducts([...selectedProducts, product.barcode]);
//                                     }
//                                 }}
//                             />
//                             <Text>{product.name}</Text>
//                         </View>
//                     ))}
//                     <Button title="Assign Products" onPress={handleAssignProduct} />
//                 </View>
//             )}

//             {/* Display store details */}
//             {storeId && (
//                 <View style={styles.storeDetailsContainer}>
//                     <Text style={styles.text}>Store Details</Text>
//                     <Text>Name: {storeName}</Text>
//                     <Text>Address: {storeAddress}</Text>
//                     <Text>Latitude: {latitude}</Text>
//                     <Text>Longitude: {longitude}</Text>
//                 </View>
//             )}

//             {message && <Text style={styles.message}>{message}</Text>}
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         padding: 16,
//     },
//     text: {
//         fontSize: 24,
//         fontWeight: 'bold',
//         marginBottom: 20,
//     },
//     input: {
//         height: 40,
//         borderColor: 'gray',
//         borderWidth: 1,
//         marginBottom: 12,
//         paddingHorizontal: 8,
//         width: '80%',
//     },
//     message: {
//         marginTop: 16,
//         fontSize: 16,
//         color: 'green',
//     },
//     productContainer: {
//         marginTop: 20,
//     },
//     checkboxContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 10,
//     },
//     storeDetailsContainer: {
//         marginTop: 20,
//     },
// });