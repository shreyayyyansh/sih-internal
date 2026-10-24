// client-native/components/features/reports/ReportForm.jsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { launchImageLibraryAsync } from 'expo-image-picker';
import { UploadCloud, CheckCircle2, Info, AlertCircle } from "lucide-react-native";
import { api } from "../../../lib/api";
import { useAuth0 } from "react-native-auth0";
import geohash from "ngeohash";

export default function ReportForm({ userLocation, userAddress, onSubmitSuccess }) {
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [step, setStep] = useState("idle");
  const [serverTool, setServerTool] = useState(null);

  const { getCredentials } = useAuth0();

  const pickImage = async () => {
    try {
      const result = await launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  const uploadToCloudinary = async (uri) => {
    const formData = new FormData();

    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append("file", { uri, name: filename, type });
    formData.append("upload_preset", process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = await res.json();
    return data.secure_url;
  };

  const handleSubmit = async () => {
    if (!userLocation || !imageUri) {
      Alert.alert("Missing Info", "Please provide an image and ensure location is found.");
      return;
    }

    setStep("submitting");

    try {
      const uploadedImageUrl = await uploadToCloudinary(imageUri);

      if (!uploadedImageUrl) {
        throw new Error("Failed to upload image to Cloudinary.");
      }

      const credentials = await getCredentials();
      const token = credentials?.accessToken;

      const geoHashId = geohash.encode(userLocation.lat, userLocation.lng, 7);

      const payload = {
        imageUrl: uploadedImageUrl,
        description: description,
        location: userLocation,
        geohash: geoHashId,
        address: userAddress || "Unknown Location",
        status: "INITIATED",
      };
      console.log("payload", payload);
      const response = await api.post(
        `${process.env.EXPO_PUBLIC_API_PYTHON_URL}/reports`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 200 || response.status === 201) {
        setServerTool(response.data.tool || "SAVE");
        setStep("submitted");

        if (onSubmitSuccess) onSubmitSuccess();

        setTimeout(() => {
          setStep("idle");
          setImageUri(null);
          setDescription("");
        }, 8000);
      }
    } catch (error) {
      console.error("Submission Error:", error);
      if (error.response?.status === 422 && error.response?.data?.message) {
        Alert.alert("Report Rejected", error.response.data.message);
      } else {
        Alert.alert("Error", "Failed to submit report. Please try again.");
      }
      setStep("idle");
    }
  };

  // SUCCESS UI
  if (step === "submitted") {
    const isAlreadyReported = serverTool === 'ALREADY_REPORTED';
    const isSave = serverTool === 'SAVE';
    return (
      <View style={styles.successContainer}>
        <View style={[styles.successIconWrap, isAlreadyReported ? styles.successIconAlready : isSave ? styles.successIconSave : styles.successIconUpdate]}>
          {isAlreadyReported ? (
            <AlertCircle size={48} color="#f59e0b" />
          ) : isSave ? (
            <CheckCircle2 size={48} color="#10b981" />
          ) : (
            <Info size={48} color="#818cf8" />
          )}
        </View>
        <Text style={styles.successTitle}>
          {isAlreadyReported ? 'Already Reported' : isSave ? 'Report Saved' : 'Update Received'}
        </Text>
        <Text style={styles.successBody}>
          {isAlreadyReported
            ? 'You have already reported this issue. We have it securely on record.'
            : isSave
            ? 'Our AI agents have analyzed the issue and assigned it for resolution.'
            : 'This issue has already been reported; we have updated the existing record with your input.'}
        </Text>

        <TouchableOpacity
          onPress={() => {
            setStep("idle");
            setImageUri(null);
            setDescription("");
          }}
          style={styles.anotherBtn}
        >
          <Text style={styles.anotherBtnText}>Submit Another Report</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // FORM UI
  return (
    <View style={styles.form}>
      {/* Image Upload Area */}
      <TouchableOpacity
        onPress={pickImage}
        style={styles.imageUploadArea}
        activeOpacity={0.7}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <UploadCloud size={32} color="#71717a" />
            <Text style={styles.uploadPlaceholderText}>Tap to upload evidence</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Description Input */}
      <TextInput
        style={styles.textInput}
        placeholderTextColor="#52525b"
        placeholder="Describe the severity and details of the issue..."
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        value={description}
        onChangeText={setDescription}
      />

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={!imageUri || step === "submitting"}
        style={[styles.submitBtn, imageUri ? styles.submitBtnActive : styles.submitBtnDisabled]}
      >
        {step === "submitting" ? (
          <>
            <ActivityIndicator color="white" style={{ marginRight: 8 }} />
            <Text style={styles.submitBtnText}>Uploading & Analyzing...</Text>
          </>
        ) : (
          <Text style={[styles.submitBtnText, !imageUri && styles.submitBtnTextDisabled]}>
            Submit Report
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 24,
  },
  imageUploadArea: {
    aspectRatio: 16 / 9,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#3f3f46',
    backgroundColor: 'rgba(9,9,11,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  uploadPlaceholderText: {
    color: '#ffffff',
    fontWeight: '500',
    marginTop: 8,
  },
  textInput: {
    width: '100%',
    backgroundColor: 'rgba(9,9,11,0.5)',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    minHeight: 100,
  },
  submitBtn: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  submitBtnActive: {
    backgroundColor: '#4f46e5',
  },
  submitBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  submitBtnText: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  submitBtnTextDisabled: {
    color: '#71717a',
  },
  // Success screen
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  successIconWrap: {
    padding: 16,
    borderRadius: 9999,
    marginBottom: 16,
  },
  successIconSave: {
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  successIconUpdate: {
    backgroundColor: 'rgba(99,102,241,0.2)',
  },
  successIconAlready: {
    backgroundColor: 'rgba(245,158,11,0.2)',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  successBody: {
    color: '#a1a1aa',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  anotherBtn: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  anotherBtnText: {
    color: '#d4d4d8',
    fontWeight: 'bold',
  },
});