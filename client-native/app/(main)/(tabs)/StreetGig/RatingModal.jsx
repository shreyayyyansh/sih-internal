import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Star, X, CheckCircle2 } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { api } from '../../../../lib/api';
import { useAuth0 } from 'react-native-auth0';

export default function RatingModal({ visible, onClose, job, workerToRate, onSuccess }) {
  const { getCredentials } = useAuth0();
  
  const [questions, setQuestions] = useState([]);
  const [currentStep, setCurrentStep] = useState(0); // 0, 1, 2 for questions, 3 for description
  
  const [ratings, setRatings] = useState([0, 0, 0]);
  const [description, setDescription] = useState('');
  
  const [isFetchingForm, setIsFetchingForm] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible && job) {
      fetchQuestions();
    } else {
      // Reset state on close
      setCurrentStep(0);
      setRatings([0, 0, 0]);
      setDescription('');
    }
  }, [visible, job]);

  const fetchQuestions = async () => {
    setIsFetchingForm(true);
    try {
      const credentials = await getCredentials();
      const token = credentials?.accessToken;
      const res = await api.get(`/api/jobs/${job.id}/feedback-form`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // We expect 3 rating questions + 1 comment question from the AI
      let qs = res.data.questions || [];
      if (qs.length === 0) qs = [
        { question: "How was the worker's punctuality?", type: "rating", max_score: 5 },
        { question: "How was the worker's quality of work?", type: "rating", max_score: 5 },
        { question: "How was the worker's professionalism?", type: "rating", max_score: 5 },
        { question: "Do you have any additional comments or suggestions?", type: "comment" }
      ];
      setQuestions(qs);
    } catch (error) {
       console.error("Failed to fetch feedback form", error);
       Alert.alert("Error", "Could not load feedback form. Using default questions.");
       setQuestions([
         { question: "How was the worker's punctuality?", type: "rating", max_score: 5 },
         { question: "How was the worker's quality of work?", type: "rating", max_score: 5 },
         { question: "How was the worker's professionalism?", type: "rating", max_score: 5 },
         { question: "Do you have any additional comments or suggestions?", type: "comment" }
       ]);
    } finally {
       setIsFetchingForm(false);
    }
  };

  const handleRate = (stars) => {
    const newRatings = [...ratings];
    newRatings[currentStep] = stars;
    setRatings(newRatings);
    
    // Auto-advance after small delay for UX
    setTimeout(() => {
      setCurrentStep(prev => prev + 1);
    }, 400);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert("Required", "Please provide a short description of the work done.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const credentials = await getCredentials();
      const token = credentials?.accessToken;

      // Build properly paired question-answer data for the backend + Python agent
      const ratingQuestions = questions.filter(q => (q.type || 'rating') === 'rating');
      const commentQuestion = questions.find(q => q.type === 'comment');

      const pairedQuestions = ratingQuestions.map((q, i) => ({
        question: q.question || q,
        type: 'rating',
        answer: ratings[i] || 0
      }));

      if (commentQuestion) {
        pairedQuestions.push({
          question: commentQuestion.question || commentQuestion,
          type: 'comment',
          answer: description
        });
      }
      
      const payload = {
        ratings,
        workerId: workerToRate.id,
        pairedQuestions
      };
      
      // Fire and forget endpoint (returns fast, processes AI in background)
      await api.post(`/api/jobs/${job.id}/close-and-rate`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Close modal immediately
      onSuccess();
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to submit feedback and close job.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  // Extract the 4th question text (comment type) for the description step
  const commentQ = questions.find(q => q.type === 'comment');
  const commentQuestionText = commentQ?.question || null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
         
         <View style={{ backgroundColor: '#18181b', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
               <View>
                 <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Rate {workerToRate?.name}</Text>
                 <Text style={{ color: '#a1a1aa', fontSize: 13, marginTop: 4 }}>Closing deal for: {job?.title}</Text>
               </View>
               <TouchableOpacity onPress={onClose} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 }}>
                 <X size={20} color="#a1a1aa" />
               </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 32, overflow: 'hidden' }}>
               <View style={{ height: '100%', backgroundColor: '#818cf8', width: `${((currentStep) / 4) * 100}%` }} />
            </View>

            {isFetchingForm ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#818cf8" />
                <Text style={{ color: '#a1a1aa', marginTop: 16 }}>Loading personalized questions...</Text>
              </View>
            ) : (
               <View style={{ minHeight: 200 }}>
                  
                  {/* STAR RATING STEPS (0, 1, 2) */}
                  {currentStep < 3 && (
                    <Animated.View key={`step-${currentStep}`} entering={FadeInRight} exiting={FadeOutLeft} style={{ flex: 1, justifyContent: 'center' }}>
                       <Text style={{ color: '#e4e4e7', fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 32, paddingHorizontal: 10 }}>
                          {questions[currentStep]?.question || questions[currentStep]}
                       </Text>
                       
                       <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity 
                              key={star} 
                              onPress={() => handleRate(star)}
                              style={{ padding: 4 }}
                            >
                              <Star 
                                size={40} 
                                color={ratings[currentStep] >= star ? "#fbbf24" : "#3f3f46"} 
                                fill={ratings[currentStep] >= star ? "#fbbf24" : "transparent"} 
                              />
                            </TouchableOpacity>
                          ))}
                       </View>
                       <Text style={{ color: '#71717a', fontSize: 12, textAlign: 'center', marginTop: 24 }}>Tap a star to rate</Text>
                    </Animated.View>
                  )}

                  {/* DESCRIPTION STEP (3) */}
                  {currentStep === 3 && (
                    <Animated.View entering={FadeInRight} style={{ flex: 1 }}>
                       <Text style={{ color: '#e4e4e7', fontSize: 16, fontWeight: '600', marginBottom: 16 }}>
                          {commentQuestionText || "Please provide a short description of their work."}
                       </Text>
                       <TextInput
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderRadius: 16,
                            padding: 16,
                            color: '#fff',
                            fontSize: 15,
                            height: 120,
                            textAlignVertical: 'top'
                          }}
                          placeholder="What did they do well? What could be improved? (This helps AI understand their skill gaps)"
                          placeholderTextColor="#52525b"
                          multiline
                          value={description}
                          onChangeText={setDescription}
                       />
                       
                       <TouchableOpacity 
                          disabled={isSubmitting}
                          onPress={handleSubmit}
                          style={{
                            backgroundColor: '#4f46e5',
                            paddingVertical: 16,
                            borderRadius: 16,
                            alignItems: 'center',
                            marginTop: 24,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 8,
                            opacity: isSubmitting ? 0.7 : 1
                          }}
                       >
                          {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <CheckCircle2 size={20} color="#fff" />}
                          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                            {isSubmitting ? 'Submitting & Closing Deal...' : 'Submit Feedback'}
                          </Text>
                       </TouchableOpacity>
                    </Animated.View>
                  )}

               </View>
            )}

         </View>
      </View>
    </Modal>
  );
}
