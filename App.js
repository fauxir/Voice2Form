import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Audio } from "expo-av";
import axios from "axios";
import * as SQLite from 'expo-sqlite';

const App = () => {
  const [recording, setRecording] = React.useState(); //object with rec data, cleared once rec data has been extracted
  const [path, setPath] = React.useState(""); //sets path of rec
  const [recResponse, setRecResponse] = React.useState(""); //object with rec data from BE
  const [inputText, setInputText] = useState(""); // variable for manual text change
  const input1Ref = useRef(null); // future use for jumping to another field
  const input2Ref = useRef(null); // future use for jumping to another field
  const input3Ref = useRef(null); // future use for jumping to another field
  const [isLoading, setIsLoading] = useState(false); //shows loader
  const [stoppedRec, setStoppedRec] = useState(false); //when true handdle sub and send to BE
  const [inputCount, setInputCount] = useState(1); // keeps track of input filled field
  const [inputObj, setInputObj] = useState({
    input1: "",
    input2: "",
    input3: "",
    input4: "",
    input5: "",
    input6: "",
    input7: "",
  }); // input object
  const [sound, setSound] = React.useState(); //notification sound
  const [metering, setMetering] = useState(); // measure noise levels
  const [quietDuration, setQuietDuration] = useState(0); // quiet duration

  //notification playback
  async function playSound() {
    console.log("Loading Sound");
    const { sound } = await Audio.Sound.createAsync(
      require("./assets/rec_sound.wav")
    );
    setSound(sound);

    console.log("Playing Sound");
    await sound.playAsync();
  }

  React.useEffect(() => {
    return sound
      ? () => {
          console.log("Unloading Sound");
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  //start recording
  async function startRecording() {
    playSound();
    try {
      console.log("Requesting permissions..");
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("Starting recording..");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      // Continuously monitor microphone levels
      Audio.setAudioModeAsync({ allowsRecordingIOS: true });
      recording.setOnRecordingStatusUpdate((status) => {
        const { isRecording, durationMillis, metering } = status;
        setMetering(metering);
      });
      console.log("Recording started");
    } catch (err) {
      console.error("Failed to start recording", err);
      showErrorAlert("Failed to start recording, please try again.");
    }
  }

  //stop recording
  async function stopRecording() {
    console.log("Stopping recording..");
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    setPath(recording.getURI());
    setStoppedRec(true);
  }

  //once stopped rec sed to server and handdle submission
  useEffect(() => {
    if (stoppedRec) {
      sendRecordingToBackend();
      handleSubmission();
      setStoppedRec(false);
    }
  }, [stoppedRec]);

  //send rec to server
  async function sendRecordingToBackend() {
    const fileUri = path;
    // setInputText("");// clears content for re recording
    try {
      const formData = new FormData();
      formData.append("recording", {
        uri: fileUri,
        type: "audio/m4a",
        name: "recording.m4a",
      });

      setRecResponse(
        await axios.post("https://4cdb-2a02-c7c-9a55-b700-ec3b-af23-9209-c458.ngrok-free.app", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
      );
      console.log("Upload successful");
    } catch (error) {
      console.log("Error occurred while uploading the recording:", error);
      showErrorAlert(
        "Error occurred while uploading the recording, please try again."
      );
    }
  }

  // prepares input for manual text change
  useEffect(() => {
    setInputText(recResponse.data?.result);
  }, [recResponse]);

  // changes input is you manually want to type
  const handleChangeText = (text, inputField) => {
    setInputObj((prevInputObj) => ({
      ...prevInputObj,
      [inputField]: text,
    }));
  };

  const focusNextInput = (nextInputRef) => {
    nextInputRef.current.focus();
  };

  // Loader when text is loading
  const handleSubmission = () => {
    setIsLoading(true);
  };

  //Enable and disable loader
  useEffect(() => {
    if (inputText) {
      setIsLoading(false);
    }
  }, [inputText]);

  const str = "next.";
  const str2 = "next";
  
  useEffect(() => {
    if (inputText) {
      // If last word is 'next', start the recording again
      const words = inputText.split(' ');
      if (words.length > 0 && (words[words.length - 1].toLowerCase() === str || words[words.length - 1].toLowerCase() === str2)) {
        startRecording();
      }
  
      // Set inputs by voice, excluding the last word 'next' if it exists
      if (inputCount === 1) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input1: words.length > 0 && words[words.length - 1].toLowerCase() === str || words[words.length - 1].toLowerCase() === str2 ? words.slice(0, -1).join(' ') : inputText,
        }));
        console.log(inputObj.input1);
        setInputCount(2);
      } else if (inputCount === 2) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input2: words.length > 0 && words[words.length - 1].toLowerCase() === str || words[words.length - 1].toLowerCase() === str2 ? words.slice(0, -1).join(' ') : inputText,
        }));
        setInputCount(3);
      } else if (inputCount === 3) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input3: words.length > 0 && words[words.length - 1].toLowerCase() === str || words[words.length - 1].toLowerCase() === str2 ? words.slice(0, -1).join(' ') : inputText,
        }));
        setInputCount(4);
      } else if (inputCount === 4) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input4: words.length > 0 && words[words.length - 1].toLowerCase() === str || words[words.length - 1].toLowerCase() === str2 ? words.slice(0, -1).join(' ') : inputText,
        }));
        setInputCount(5);
      } else if (inputCount === 5) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input5: words.length > 0 && words[words.length - 1].toLowerCase() === str || words[words.length - 1].toLowerCase() === str2 ? words.slice(0, -1).join(' ') : inputText,
        }));
        setInputCount(6);
      } else if (inputCount === 6) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input6: words.length > 0 && words[words.length - 1].toLowerCase() === str || words[words.length - 1].toLowerCase() === str2 ? words.slice(0, -1).join(' ') : inputText,
        }));
        setInputCount(7);
      } else if (inputCount === 7) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input7: words.length > 0 && words[words.length - 1].toLowerCase() === str || words[words.length - 1].toLowerCase() === str2 ? words.slice(0, -1).join(' ') : inputText,
        }));
        setInputCount(8);
      }
    }
  }, [inputText]);
  
  

  //Error alert
  const showErrorAlert = (err) => {
    setIsLoading(false);
    Alert.alert("Error", err, [
      { text: "OK", onPress: () => console.log("OK Pressed") },
    ]);
  };

  //start stop recording on button press
  const onPressHandler = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // metering noise levels hard coded levels
  useEffect(() => {
    console.log(metering);
    const quietThreshold = -35; // dB threshold for quietness
    const requiredDuration = 0.15; // seconds
    const interval = 100; // milliseconds (adjust as needed)

    const currentLevel = metering;
    if (currentLevel <= quietThreshold) {
      console.log("stage 1");
      setQuietDuration((prevQuietDuration) => prevQuietDuration + interval);
      console.log("stage 1", quietDuration);
      if (quietDuration >= requiredDuration * 1000) {
        console.log("Quietness detected for the required duration.");
        stopRecording();
      }
    } else {
      setQuietDuration(0);
    }
  }, [metering]);

  // Database
  const db = SQLite.openDatabase(
    {
      name: 'MainDB',
      location: 'default',
    },
    ()=> {},
    error => {console.log("DB error : ", error)}
  )
  useEffect(()=>{
    createTable()
  }, [])

  const createTable = () => {
    db.transaction((tx) =>{
      tx.executeSql(
        "CREATE TABLE IF NOT EXISTS "
        +"Form inputs " // Name of the table
        +"(ID INTEGER PRIMARY KEY AUTOINCREMENT, Input TEXT)" // First column for ID and second column for inputs 
      )
    })
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Testing recording</Text>
      <TouchableOpacity
        style={[styles.button, recording && styles.buttonRecording]}
        onPressIn={startRecording}
        onPressOut={stopRecording}
      >
        <Text style={styles.buttonText}>
          {recording ? "Recording..." : "Press and hold to record"}
        </Text>
      </TouchableOpacity>
      <View style={styles.breakLine} />
      <TouchableOpacity onPress={onPressHandler} style={styles.button}>
        <Text style={styles.buttonText}>
          {recording ? "Stop Recording" : "Start Recording"}
        </Text>
      </TouchableOpacity>
      <View style={styles.outputWrapper}>
        <View style={styles.fieldWrapper}>
          <TextInput
            ref={input1Ref}
            value={inputObj.input1}
            onChangeText={(text) => handleChangeText(text, "input1")}
            style={styles.output}
            returnKeyType="next"
            onSubmitEditing={() => focusNextInput(input2Ref)}
            // onContentSizeChange={() => focusNextInput(input2Ref)}
          />
          {isLoading && inputCount === 1 && (
            <ActivityIndicator style={styles.loading} />
          )}
        </View>
        <View style={styles.fieldWrapper}>
          <TextInput
            style={styles.output}
            value={inputObj.input2}
            onChangeText={(text) => handleChangeText(text, "input2")}
            ref={input2Ref}
            returnKeyType="next"
            onSubmitEditing={() => focusNextInput(input3Ref)}
          />
          {isLoading && inputCount === 2 && (
            <ActivityIndicator style={styles.loading} />
          )}
        </View>
        <View style={styles.fieldWrapper}>
          <TextInput
            value={inputObj.input3}
            onChangeText={(text) => handleChangeText(text, "input3")}
            style={styles.output}
          />
          {isLoading && inputCount === 3 && (
            <ActivityIndicator style={styles.loading} />
          )}
        </View>
        <View style={styles.fieldWrapper}>
          <TextInput
            value={inputObj.input4}
            onChangeText={(text) => handleChangeText(text, "input4")}
            style={styles.output}
          />
          {isLoading && inputCount === 4 && (
            <ActivityIndicator style={styles.loading} />
          )}
        </View>
        <View style={styles.fieldWrapper}>
          <TextInput
            value={inputObj.input5}
            onChangeText={(text) => handleChangeText(text, "input5")}
            style={styles.output}
          />
          {isLoading && inputCount === 5 && (
            <ActivityIndicator style={styles.loading} />
          )}
        </View>
        <View style={styles.fieldWrapper}>
          <TextInput
            value={inputObj.input6}
            onChangeText={(text) => handleChangeText(text, "input6")}
            style={styles.output}
          />
          {isLoading && inputCount === 6 && (
            <ActivityIndicator style={styles.loading} />
          )}
        </View>
        <View style={styles.fieldWrapper}>
          <TextInput
            value={inputObj.input7}
            onChangeText={(text) => handleChangeText(text, "input7")}
            style={styles.output}
          />
          {isLoading && inputCount === 7 && (
            <ActivityIndicator style={styles.loading} />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    paddingTop: 25,
    backgroundColor: "#fff",
  },
  fieldWrapper: {},
  loading: {
    position: "absolute",
    top: 10,
    left: 10,
  },
  breakLine: {
    marginTop: 20,
  },
  heading: {
    fontSize: 24,
    marginTop: 55,
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 16,
  },
  output: {
    borderColor: "gray",
    borderWidth: 1,
    height: 40,
  },
  outputWrapper: {
    marginTop: 20,
  },
  play: {
    marginTop: 25,
    paddingTop: 20,
    backgroundColor: "orange",
  },
  button: {
    backgroundColor: "blue",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonRecording: {
    backgroundColor: "6c00ff",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
});

export default App;
