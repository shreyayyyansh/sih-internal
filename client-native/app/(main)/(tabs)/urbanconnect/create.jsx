//for creating the post 


import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, Alert, ScrollView, ActivityIndicator, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Image as ImageIcon, Building2, Check } from 'lucide-react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../../../store/useAuthStore';
import { api } from '../../../../lib/api';

export default function CreatePost() {
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Authorities tagging state
  const [showAuthorityModal, setShowAuthorityModal] = useState(false);
  const [authorities, setAuthorities] = useState([]);
  const [taggedAuthorities, setTaggedAuthorities] = useState([]);
  const [citySearch, setCitySearch] = useState('');
  const [isFetchingAuthorities, setIsFetchingAuthorities] = useState(false);

  // Fetch authorities when city changes
  useEffect(() => {
    const fetchAuth = async () => {
      if (!citySearch.trim()) {
        setAuthorities([]);
        return;
      }
      setIsFetchingAuthorities(true);
      try {
        const res = await api.get(`/api/urbanconnect/authorities/${citySearch}`);
        setAuthorities(res.data);
      } catch (error) {
        console.error("Failed to fetch authorities", error);
      } finally {
        setIsFetchingAuthorities(false);
      }
    };
    
    // Simple debounce
    const timeoutId = setTimeout(() => {
      fetchAuth();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [citySearch]);

  const toggleAuthorityTag = (auth) => {
    setTaggedAuthorities(prev => {
      const isTagged = prev.some(a => a._id === auth._id);
      if (isTagged) {
        return prev.filter(a => a._id !== auth._id);
      } else {
        return [...prev, auth];
      }
    });
  };

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const handlePost = async () => {
    if (!title.trim() && !content.trim() && !selectedImage) return;
    setIsPosting(true);
    
    let imageUrl = null;
    
    try {
      // 1. Upload image if selected
      if (selectedImage) {
        setUploading(true);
        const formData = new FormData();
        const uri = selectedImage.uri;
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        formData.append('image', { uri, name: filename, type });

        const uploadRes = await api.post('/api/urbanconnect/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        imageUrl = uploadRes.data.url;
        setUploading(false);
      }

      // 2. Create post
      await api.post('/api/urbanconnect/ask', { 
        title: title.trim() || 'New Update', 
        description: content.trim() || ' ',
        image: imageUrl ? [imageUrl] : [],
        author: user,
        taggedAuthorities: taggedAuthorities.map(a => a._id)
      });
      
      router.back();
    } catch (err) {
      console.log('Error posting:', err);
      Alert.alert("Error", "Failed to post. Please try again.");
    } finally {
      setIsPosting(false);
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 16,
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)'
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <X size={24} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handlePost}
          disabled={(!title.trim() && !content.trim() && !selectedImage) || isPosting || uploading}
          style={{
            backgroundColor: (title.trim() || content.trim() || selectedImage) ? '#3b82f6' : '#1e3a8a',
            paddingHorizontal: 20,
            paddingVertical: 8,
            borderRadius: 20,
            opacity: ((!title.trim() && !content.trim() && !selectedImage) || isPosting || uploading) ? 0.6 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8
          }}
        >
          {(isPosting || uploading) && <ActivityIndicator size="small" color="#fff" />}
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>
            {isPosting ? 'Posting...' : uploading ? 'Uploading...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView style={{ flex: 1 }}>
          <View style={{ flex: 1, padding: 16, flexDirection: 'row' }}>
            {/* Avatar Column */}
            <View style={{ width: 48, alignItems: 'center' }}>
              {user?.picture ? (
                <Image source={{ uri: user.picture }} style={{ width: 44, height: 44, borderRadius: 22 }} />
              ) : (
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#27272a', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{user?.name?.charAt(0) || 'U'}</Text>
                </View>
              )}
            </View>

            {/* Input Column */ }
            <View style={{ flex: 1, marginLeft: 12 }}>
              <TextInput
                placeholder="Title"
                placeholderTextColor="#a1a1aa"
                value={title}
                onChangeText={setTitle}
                autoFocus
                style={{
                  color: '#fff',
                  fontSize: 22,
                  fontWeight: 'bold',
                  marginBottom: 8,
                }}
              />
              <TextInput 
                placeholder="What's happening in your city?"
                placeholderTextColor="#71717a"
                multiline
                value={content}
                onChangeText={setContent}
                style={{
                  color: '#fff',
                  fontSize: 18,
                  lineHeight: 26,
                  minHeight: 100,
                  maxHeight: 200
                }}
              />

              {/* Image Preview */}
              {selectedImage && (
                <View style={{ marginTop: 12, position: 'relative' }}>
                  <Image 
                    source={{ uri: selectedImage.uri }} 
                    style={{ width: '100%', aspectRatio: 16/9, borderRadius: 12 }} 
                  />
                  <TouchableOpacity 
                    onPress={removeImage}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <X size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Toolbar */}
        <View style={{ 
          padding: 16, 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.08)',
          backgroundColor: '#050510'
        }}>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <TouchableOpacity onPress={pickImage}>
              <ImageIcon size={22} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAuthorityModal(true)}>
                <Building2 size={22} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Authorities Modal */}
      <Modal
        visible={showAuthorityModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAuthorityModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#09090b' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#27272a' }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Tag Authorities</Text>
            <TouchableOpacity onPress={() => setShowAuthorityModal(false)}>
              <Text style={{ color: '#3b82f6', fontSize: 16, fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={{ padding: 16 }}>
            <TextInput
              placeholder="Enter City (e.g. Delhi)"
              placeholderTextColor="#71717a"
              value={citySearch}
              onChangeText={setCitySearch}
              style={{
                backgroundColor: '#18181b',
                color: '#fff',
                padding: 12,
                borderRadius: 8,
                fontSize: 16,
                marginBottom: 16
              }}
            />

            {isFetchingAuthorities ? (
              <ActivityIndicator color="#3b82f6" style={{ marginTop: 20 }} />
            ) : authorities.length === 0 ? (
              <Text style={{ color: '#71717a', textAlign: 'center', marginTop: 20 }}>
                {citySearch.trim() ? "No authorities found for this city." : "Type a city to search for authorities."}
              </Text>
            ) : (
              <FlatList
                data={authorities}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                  const isSelected = taggedAuthorities.some(a => a._id === item._id);
                  return (
                    <TouchableOpacity
                      onPress={() => toggleAuthorityTag(item)}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 16,
                        backgroundColor: '#18181b',
                        borderRadius: 8,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: isSelected ? '#3b82f6' : 'transparent'
                      }}
                    >
                      <View>
                         <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }}>{item.postName}</Text>
                         <Text style={{ color: '#a1a1aa', fontSize: 14 }}>{item.department}</Text>
                      </View>
                      {isSelected && <Check color="#3b82f6" size={20} />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}
