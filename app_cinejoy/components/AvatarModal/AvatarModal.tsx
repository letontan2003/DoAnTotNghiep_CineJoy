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
  modalAvatar: {
    width: "100%",
    height: "100%",
  },
});

export default AvatarModal;
