import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";

export default function IconButton({ icon, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.button}>
      {icon}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
});
