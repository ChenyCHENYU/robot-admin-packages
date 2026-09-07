import { defineComponent, h, type Component } from "vue";
import { useLayoutContext } from "./useLayoutContext";

const FallbackLayoutIcon = defineComponent({
  name: "FallbackLayoutIcon",
  props: {
    name: String,
    size: { type: Number, default: 18 },
  },
  setup(props) {
    return () =>
      h("i", {
        class: props.name,
        style: {
          alignItems: "center",
          display: "inline-flex",
          fontSize: `${props.size}px`,
          justifyContent: "center",
        },
      });
  },
});

/** 返回宿主图标组件；未配置时使用零依赖 CSS class 渲染器。 */
export function useLayoutIcon(): Component {
  return useLayoutContext().iconComponent ?? FallbackLayoutIcon;
}
