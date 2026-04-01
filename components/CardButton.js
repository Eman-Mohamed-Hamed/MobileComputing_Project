import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function CardButton({
  title,
  description,
  icon,
  onPress,
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={["#162447", "#1a2a52"]}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.icon}>{icon}</View>
          <Text style={styles.title}>{title}</Text>
        </View>

        <Text style={styles.description}>{description}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1f3460",
  },
  container: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  description: {
    color: "#8892b0",
    fontSize: 13,
  },
  icon: {},
});
