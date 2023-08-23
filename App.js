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
import * as SQLite from "expo-sqlite";
import * as FileSystem from 'expo-file-system';


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
  const [startStopRec, setStartStopRec] = useState(false); // toggle rec button
  const [buttonActive, setButtonActive] = useState(true); // deactivate press& hold rec button

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
    if (recording) {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      setPath(recording.getURI());
      setRecording(undefined);
      setStoppedRec(true);
    }
  }

  //once stopped rec sed to server and handdle submission
  useEffect(() => {
    if (stoppedRec) {
      sendRecordingToBackend();
      handleSubmission();
      setStoppedRec(false);
    }
  }, [stoppedRec]);

  const backendURL = "https://43e6-92-26-16-202.ngrok-free.app" // <--- here update BE URL

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
        await axios.post(
          backendURL,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        )
      );
      console.log("Upload successful");
    } catch (error) {
      console.log("Error occurred while uploading the recording:", error);
      showErrorAlert(
        "Error occurred while uploading the recording, please try again."
      );
    }
  }

// Send object to server
async function sendFromObjToBackend(objectToSend) {
  try {
    const response = await axios.post(
      backendURL, 
      objectToSend,
      {
        headers: {
          "Content-Type": "application/json", // Set the content type to JSON
        },
      }
    );
    
    console.log("Object sent to the backend:", response.data);
    return response.data;
  } catch (error) {
    console.log("Error occurred while sending the object:", error);
    // Handle error here
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
  
    // Extract the number from the inputField (assuming it's in the format "inputX")
    const inputNumber = inputField.replace("input", "");
  
    const updateInputInDB = async (inputId, inputValue) => {
      await db.transaction(async (tx) => {
        await tx.executeSql(
          "UPDATE FormInput SET Input = ? WHERE ID = ?",
          [inputValue, inputId],
          (_, result) => {
            console.log("Data updated successfully");
          },
          (_, error) => {
            console.log("Error updating data: ", error);
          }
        );
      });
    };
  
    // Assuming you have the relevant input ID for the inputNumber
    const inputId = inputNumber;
    
    // Call the update function with the extracted number and the changed text
    updateInputInDB(inputId, text);
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
      const words = inputText.split(" ");
      if (
        words.length > 0 &&
        (words[words.length - 1].toLowerCase() === str ||
          words[words.length - 1].toLowerCase() === str2)
      ) {
        startRecording();
      }

      // Set inputs by voice, excluding the last word 'next' if it exists
      if (inputCount === 1) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input1:
            (words.length > 0 &&
              words[words.length - 1].toLowerCase() === str) ||
            words[words.length - 1].toLowerCase() === str2
              ? words.slice(0, -1).join(" ")
              : inputText,
        }));
        console.log(inputObj.input1);
        setInputCount(2);
        insertInput();
        console.log("db data? ", getData());
      } else if (inputCount === 2) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input2:
            (words.length > 0 &&
              words[words.length - 1].toLowerCase() === str) ||
            words[words.length - 1].toLowerCase() === str2
              ? words.slice(0, -1).join(" ")
              : inputText,
        }));
        setInputCount(3);
        insertInput();
        console.log("db data? ", getData());
      } else if (inputCount === 3) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input3:
            (words.length > 0 &&
              words[words.length - 1].toLowerCase() === str) ||
            words[words.length - 1].toLowerCase() === str2
              ? words.slice(0, -1).join(" ")
              : inputText,
        }));
        setInputCount(4);
        insertInput();
        console.log("db data? ", getData());
      } else if (inputCount === 4) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input4:
            (words.length > 0 &&
              words[words.length - 1].toLowerCase() === str) ||
            words[words.length - 1].toLowerCase() === str2
              ? words.slice(0, -1).join(" ")
              : inputText,
        }));
        setInputCount(5);
        insertInput();
        console.log("db data? ", getData());
      } else if (inputCount === 5) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input5:
            (words.length > 0 &&
              words[words.length - 1].toLowerCase() === str) ||
            words[words.length - 1].toLowerCase() === str2
              ? words.slice(0, -1).join(" ")
              : inputText,
        }));
        setInputCount(6);
        insertInput();
        console.log("db data? ", getData());
      } else if (inputCount === 6) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input6:
            (words.length > 0 &&
              words[words.length - 1].toLowerCase() === str) ||
            words[words.length - 1].toLowerCase() === str2
              ? words.slice(0, -1).join(" ")
              : inputText,
        }));
        setInputCount(7);
        insertInput();
        console.log("db data? ", getData());
      } else if (inputCount === 7) {
        setInputObj((prevInputObj) => ({
          ...prevInputObj,
          input7:
            (words.length > 0 &&
              words[words.length - 1].toLowerCase() === str) ||
            words[words.length - 1].toLowerCase() === str2
              ? words.slice(0, -1).join(" ")
              : inputText,
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
      setStartStopRec(false);
    } else {
      startRecording();
      setStartStopRec(true);
    }
  };

  //toggle start stop recording
  const toggleOnPressHandler = () => {
    if (buttonActive) {
      if (recording) {
        stopRecording();
      } else {
        startRecording();
      }
      // Disable the button for 1 second
      setButtonActive(false);
      setTimeout(() => setButtonActive(true), 1000); // Enable the button after 1 second
    }
  };

  // metering noise levels hard coded levels
  useEffect(() => {
    if (startStopRec) {
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
    }
  }, [metering]);

  // Create DB
  const db = SQLite.openDatabase("MainDB.db");

  // Init DB
  const createTable = () => {
    db.transaction((tx) => {
      tx.executeSql(
        "CREATE TABLE IF NOT EXISTS FormInput " +
          "(ID INTEGER PRIMARY KEY AUTOINCREMENT, Input TEXT)",
        [],
        () => {
          console.log("Table created successfully");
        },
        (txObj, error) => {
          console.log("Error creating table: ", error);
        }
      );
    });
  };

  useEffect(() => {
    createTable();
  }, []);

  const insertInput = async () => {
    await db.transaction(async (tx) => {
      await tx.executeSql(
        "INSERT INTO FormInput (Input) VALUES (?)",
        [inputText], // Use parameter binding to avoid SQL injection
        (_, result) => {
          console.log("Data inserted successfully");
        },
        (_, error) => {
          console.log("Error inserting data: ", error);
        }
      );
    });
  };

  const getData = () => {
    try {
      db.transaction((tx) => {
        tx.executeSql(
          "SELECT Input FROM FormInput",
          [],
          (_, results) => {
            var len = results.rows.length;
            if (len > 0) {
              console.log("input count: ", inputCount - 1);
              var userInput = results.rows.item(inputCount - 1).Input; // Call item() as a function
              console.log("Newest entry : ", userInput);
            }
          },
          (_, error) => {
            console.log("Error fetching data: ", error);
          }
        );
      });
    } catch (error) {
      console.log("getData error:", error);
    }
  };

  // Reset DB
  const resetDatabase = () => {
    db.transaction((tx) => {
      // Drop the existing table (if it exists)
      tx.executeSql("DROP TABLE IF EXISTS FormInput", []);
      console.log("Table deleted");
      // Create the table again
      tx.executeSql(
        "CREATE TABLE IF NOT EXISTS FormInput " +
          "(ID INTEGER PRIMARY KEY AUTOINCREMENT, Input TEXT)",
        [],
        () => {
          console.log("New table created successfully");

          // Insert initial data (if needed)
          // insertInitialData();
        },
        (_, error) => {
          console.log("Error creating table: ", error);
        }
      );
    });
  };

  //copy DB for debugging purposes
  const copyDatabaseToDownloadFolder = async () => {
    try {
      const databaseUri = `${FileSystem.documentDirectory}SQLite/MainDB.db`;
      const downloadUri = `${FileSystem.documentDirectory}MainDB.db`;
      await FileSystem.copyAsync({ from: databaseUri, to: downloadUri });
      console.log('Database file copied to Downloads folder.');
    } catch (error) {
      console.log('Error copying database file:', error);
    }
  };

  const handleResetDatabase = () => {
    // Reset the database again (use this when needed, e.g., with a reset button)
    resetDatabase();
  };

  // Convert DB data into an object and send to BE
  const getDataAsObjects = (callback) => {
    try {
      db.transaction((tx) => {
        tx.executeSql(
          "SELECT Input FROM FormInput",
          [],
          (_, results) => {
            var len = results.rows.length;
            if (len > 0) {
              var dataObjects = [];
              for (let i = 0; i < len; i++) {
                dataObjects.push({ Input: results.rows.item(i).Input });
              }
              callback(dataObjects);
            }
          },
          (_, error) => {
            console.log("Error fetching data: ", error);
          }
        );
      });
    } catch (error) {
      console.log("getData error:", error);
    }
  };

  const sendFormToBe = () => {
    getDataAsObjects((dataObjects) => {
      sendFromObjToBackend(dataObjects);
      console.log("Data retrieved as objects:", dataObjects)
    })
  }

  // getDataAsObjects((dataObjects) => {
  //   console.log("Data retrieved as objects:", dataObjects);
  // });

  // console.log("here --->",inputObj)

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Testing recording</Text>
      <TouchableOpacity
        style={[styles.button, !buttonActive && styles.buttonInactive, recording && styles.buttonRecording]}
        onPressIn={toggleOnPressHandler}
        disabled={!buttonActive} // Disable the button when buttonActive is false
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
        <View style={styles.breakLine}>
          <TouchableOpacity
            title="Reset Database"
            onPress={handleResetDatabase}
            style={[styles.button, recording && styles.buttonRecording]}
          >
            <Text style={styles.buttonText}>DB Reset</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.breakLine}>
          <TouchableOpacity
            title="Send form toBE"
            onPress={sendFormToBe}
            style={[styles.button, recording && styles.buttonRecording]}
          >
            <Text style={styles.buttonText}>Send form to BE</Text>
          </TouchableOpacity>
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
  buttonInactive: {
    backgroundColor: "#ccc",
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
