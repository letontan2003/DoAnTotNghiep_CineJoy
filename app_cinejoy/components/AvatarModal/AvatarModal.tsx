import React from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import Fontisto from "@expo/vector-icons/Fontisto";

interface AvatarModalProps {
  visible: boolean;
  avatarUri: string | null | undefined;
  onClose: () => void;
}

const AvatarModal = ({ visible, avatarUri, onClose }: AvatarModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalCloseArea}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Fontisto name="close-a" size={24} color="#fff" />
          </TouchableOpacity>
          {avatarUri && (
            <Image
              source={{ uri: avatarUri }}
              style={styles.modalAvatar}
              resizeMode="contain"
            />
          )}
        </View>
        <TouchableOpacity
          style={styles.modalCloseArea}
          activeOpacity={1}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseArea: {
    flex: 1,
    width: "100%",
  },
  modalContent: {
    width: Dimensions.get("window").width * 0.9,
    height: Dimensions.get("window").width * 0.9,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  modalCloseButton: {
    position: "absolute",
    top: -15,
    right: -15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  modalAvatar: {
    width: "95%",
    height: "100%",
    borderRadius: 10,
  },
});

export default AvatarModal;
