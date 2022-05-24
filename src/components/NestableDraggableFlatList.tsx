import React, { useRef, useState } from "react";
import { findNodeHandle, LogBox } from "react-native";
import Animated, {
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { DraggableFlatListProps } from "../types";
import DraggableFlatList from "../components/DraggableFlatList";
import { useSafeNestableScrollContainerContext } from "../context/nestableScrollContainerContext";
import { useNestedAutoScroll } from "../hooks/useNestedAutoScroll";
import { typedMemo } from "../utils";
import { useIdentityRetainingCallback } from "../hooks/useIdentityRetainingCallback";

function NestableDraggableFlatListInner<T>(props: DraggableFlatListProps<T>) {
  const hasSuppressedWarnings = useRef(false);

  if (!hasSuppressedWarnings.current) {
    LogBox.ignoreLogs([
      "VirtualizedLists should never be nested inside plain ScrollViews with the same orientation because it can break windowing",
    ]); // Ignore log notification by message
    //@ts-ignore
    console.reportErrorsAsExceptions = false;
    hasSuppressedWarnings.current = true;
  }

  const {
    scrollableRef,
    outerScrollOffset,
    setOuterScrollEnabled,
  } = useSafeNestableScrollContainerContext();

  const listVerticalOffset = useSharedValue(0);
  const [animVals, setAnimVals] = useState({});
  const defaultHoverOffset = useSharedValue(0);
  const [listHoverOffset, setListHoverOffset] = useState(defaultHoverOffset);

  const hoverOffset = useDerivedValue(() => {
    return listHoverOffset.value + listVerticalOffset.value;
  }, [listHoverOffset]);

  useNestedAutoScroll({
    ...animVals,
    hoverOffset,
  });

  const onListContainerLayout = useIdentityRetainingCallback(
    async ({ containerRef }) => {
      const nodeHandle = findNodeHandle(scrollableRef.current);

      const onSuccess = (_x: number, y: number) => {
        listVerticalOffset.value = y;
      };
      const onFail = () => {
        console.log("## nested draggable list measure fail");
      };
      //@ts-ignore
      containerRef.current.measureLayout(nodeHandle, onSuccess, onFail);
    }
  );

  const onDragBegin: DraggableFlatListProps<T>["onDragBegin"] = useIdentityRetainingCallback(
    (params) => {
      setOuterScrollEnabled(false);
      props.onDragBegin?.(params);
    }
  );

  const onDragEnd: DraggableFlatListProps<T>["onDragEnd"] = useIdentityRetainingCallback(
    (params) => {
      setOuterScrollEnabled(true);
      props.onDragEnd?.(params);
    }
  );

  const onAnimValInit: DraggableFlatListProps<T>["onAnimValInit"] = useIdentityRetainingCallback(
    (params) => {
      setListHoverOffset(params.hoverOffset);
      setAnimVals({
        ...params,
        hoverOffset,
      });
      props.onAnimValInit?.(params);
    }
  );

  return (
    <DraggableFlatList
      onContainerLayout={onListContainerLayout}
      activationDistance={props.activationDistance || 20}
      scrollEnabled={false}
      {...props}
      outerScrollOffset={outerScrollOffset}
      onDragBegin={onDragBegin}
      onDragEnd={onDragEnd}
      onAnimValInit={onAnimValInit}
    />
  );
}

export const NestableDraggableFlatList = typedMemo(
  NestableDraggableFlatListInner
);
