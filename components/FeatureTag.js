import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function FeatureTag({ icon, text, color }) {
  return (
    <View style={[styles.tag, { borderColor: color || "#0066ff" }]}>
      {icon}
      <Text style={[styles.text, { color: color || "#0066ff" }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
  },
});
