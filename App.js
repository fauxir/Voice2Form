import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Audio } from "expo-av";
import axios from "axios";

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
  const [inputCount, setInputCount] = useState(1);
  const [inputObj, setInputObj] = useState({
    input1: "",
    input2: "",
    input3: "",
    input4: "",
    input5: "",
    input6: "",
    input7: "",
  });

  //start recording
  async function startRecording() {
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
      console.log("Recording started");
    } catch (err) {
      console.error("Failed to start recording", err);
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
        await axios.post("https://b401-92-26-12-87.ngrok-free.app", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
      );
      console.log("Upload successful");
    } catch (error) {
      console.log("Error occurred while uploading the recording:", error);
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

  //set inputs by voice
  useEffect(() => {
    if (inputText) {
      if (inputCount === 1) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input1: inputText,
        }));
        console.log(inputObj.input1);
        setInputCount(2);
      } else if (inputCount === 2) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input2: inputText,
        }));
        setInputCount(3);
      } else if (inputCount === 3) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input3: inputText,
        }));
        setInputCount(4);
      } else if (inputCount === 4) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input4: inputText,
        }));
        setInputCount(5);
      } else if (inputCount === 5) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input5: inputText,
        }));
        setInputCount(6);
      } else if (inputCount === 6) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input6: inputText,
        }));
        setInputCount(7);
      } else if (inputCount === 7) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input7: inputText,
        }));
        setInputCount(8);
      }
    }
  }, [inputText]);

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
      <ActivityIndicator animating={isLoading} style={styles.loading} />
      <View style={styles.outputWrapper}>
        <TextInput
          ref={input1Ref}
          value={inputObj.input1}
          onChangeText={(text) => handleChangeText(text, "input1")}
          style={styles.output}
          returnKeyType="next"
          // onContentSizeChange={() => focusNextInput(input2Ref)}
        />
        <TextInput
          style={styles.output}
          value={inputObj.input2}
          onChangeText={(text) => handleChangeText(text, "input2")}
          ref={input2Ref}
          returnKeyType="next"
          onSubmitEditing={() => focusNextInput(input3Ref)}
        />
        <TextInput
          value={inputObj.input3}
          onChangeText={(text) => handleChangeText(text, "input3")}
          style={styles.output}
        />
        <TextInput
          value={inputObj.input4}
          onChangeText={(text) => handleChangeText(text, "input4")}
          style={styles.output}
        />
        <TextInput
          value={inputObj.input5}
          onChangeText={(text) => handleChangeText(text, "input5")}
          style={styles.output}
        />
        <TextInput
          value={inputObj.input6}
          onChangeText={(text) => handleChangeText(text, "input6")}
          style={styles.output}
        />
        <TextInput
          value={inputObj.input7}
          onChangeText={(text) => handleChangeText(text, "input7")}
          style={styles.output}
        />
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
  loading: {
    position: "relative",
    top: 32,
  },
  heading: {
    fontSize: 24,
    marginTop: 55,
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 16,
  },
  output: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginTop: -17,
    marginBottom: 16,
    paddingLeft: 8,
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
