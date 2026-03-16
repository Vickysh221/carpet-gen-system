import clsx from "clsx";
import svgPaths from "./svg-zts9thkueh";
import imgProperty1Default from "figma:asset/b6dd505b250571fc53f58ad0fe392a93a3e7846a.png";
import img from "figma:asset/13f99fecf4d10fae2e2ed4ba4174fc87fa3a3f96.png";
import img1 from "figma:asset/c9e88114ceab979959b9b9326e445337371e2024.png";
import img2 from "figma:asset/f388e72e028f6996638daecb2e4f1ddef9acc8f5.png";
import img3 from "figma:asset/4d380627eec25cb6130ce419a12e70cf321ae37e.png";
import img4 from "figma:asset/4f1130b3dd48bbf02568141e8d683b8f8a7a6fb5.png";
import img5 from "figma:asset/fd407a342467125411c172ada697b4ff5262c37b.png";
import img6 from "figma:asset/2219ff8640fb32b5fe4d36035933e968ad811d29.png";
import imgImage278 from "figma:asset/3b0f7e643a37e50bcc084af66c1676c7548863fd.png";
import imgImage277 from "figma:asset/06b2a022fae9627b99cd7cdcbde93041c712c19e.png";
import imgImage280 from "figma:asset/5802c8bd2d23935230bf071ebeffba91a400c6bd.png";
import imgImage281 from "figma:asset/a4a5725df8c842a1d1123ea35fafaec34755333e.png";
import imgImage47 from "figma:asset/270367ecd171e06ef06fec38965ce8a076c7925b.png";
import imgImage271 from "figma:asset/1ba2666d0da91802c1ffd7f710bfbfe0a34ad7e5.png";
type ComponentHelperProps = {
  additionalClassNames?: string;
};

function ComponentHelper({ children, additionalClassNames = "" }: React.PropsWithChildren<ComponentHelperProps>) {
  return (
    <div className={clsx("absolute", additionalClassNames)}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 21.504 19.8805">
        {children}
      </svg>
    </div>
  );
}
type TextProps = {
  text: string;
  additionalClassNames?: string;
};

function Text({ text, additionalClassNames = "" }: TextProps) {
  return (
    <div className={clsx("bg-black col-1 h-[60px] mt-0 relative row-1 w-[161px]", additionalClassNames)}>
      <div className="content-stretch flex items-center justify-center overflow-clip px-[8px] py-[9px] relative rounded-[inherit] size-full">
        <p className="font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[16px] text-white whitespace-nowrap">{text}</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.5)] border-solid inset-0 pointer-events-none shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]" />
    </div>
  );
}
type ComponentProps = {
  className?: string;
  property1?: "Default" | "Variant2";
};

function Component({ className, property1 = "Default" }: ComponentProps) {
  const isVariant2 = property1 === "Variant2";
  return (
    <div className={className || "h-[393px] relative w-[296px]"}>
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgProperty1Default} />
      {isVariant2 && (
        <>
          <div className="absolute contents inset-[0_0_0.25%_0]">
            <div className="absolute bg-[rgba(0,0,0,0.45)] inset-[0_0_0.25%_0]" />
            <p className="absolute font-['PingFang_SC:Regular',sans-serif] inset-[4.33%_15.54%_91.35%_52.03%] leading-[normal] not-italic text-[12px] text-white whitespace-nowrap">推荐更多类似地毯</p>
            <p className="absolute font-['PingFang_SC:Regular',sans-serif] inset-[91.86%_52.36%_3.82%_15.2%] leading-[normal] not-italic text-[12px] text-white whitespace-nowrap">推荐更少类似地毯</p>
            <ComponentHelper additionalClassNames="inset-[4.33%_4.22%_90.62%_88.51%]">
              <g id="Group">
                <path clipRule="evenodd" d={svgPaths.p4bcc200} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector" />
              </g>
            </ComponentHelper>
            <ComponentHelper additionalClassNames="inset-[91.6%_88.34%_3.34%_4.39%]">
              <g id="Group 1249">
                <g id="Group">
                  <path clipRule="evenodd" d={svgPaths.p4bcc200} fill="var(--fill-0, white)" fillRule="evenodd" id="Vector" />
                </g>
                <path d={svgPaths.p20a0eb00} id="Vector 488" stroke="var(--stroke-0, white)" strokeWidth="2" />
              </g>
            </ComponentHelper>
          </div>
          <div className="absolute contents left-[80px] top-[174px]">
            <div className="absolute bg-black content-stretch flex items-center justify-center left-[80px] px-[28px] py-[12px] top-[174px]">
              <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.5)] border-solid inset-0 pointer-events-none shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]" />
              <p className="font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[16px] text-white whitespace-nowrap">选择该方案</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Group() {
  return (
    <div className="relative size-full">
      <div className="absolute bg-white border border-black border-solid h-[702px] left-0 overflow-clip top-0 w-[1280px]" data-name="Frame">
        <div className="absolute h-[1220px] left-[23px] top-[99px] w-[1256px]">
          <Component className="absolute h-[393px] left-0 top-[-86px] w-[296px]" />
          <div className="absolute h-[393px] left-[316px] top-0 w-[296px]" data-name="灵感生成的图片">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={img} />
          </div>
          <div className="absolute h-[393px] left-[632px] top-[-86px] w-[296px]" data-name="灵感生成的图片">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={img1} />
          </div>
          <div className="absolute h-[393px] left-[948px] top-0 w-[296px]" data-name="灵感生成的图片">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={img2} />
          </div>
          <Component className="absolute h-[393px] left-[948px] top-[-1px] w-[296px]" property1="Variant2" />
          <div className="absolute h-[393px] left-0 top-[327px] w-[296px]" data-name="灵感生成的图片">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={img3} />
          </div>
          <div className="absolute h-[393px] left-[316px] top-[413px] w-[296px]" data-name="灵感生成的图片">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={img4} />
          </div>
          <div className="absolute h-[393px] left-[632px] top-[327px] w-[296px]" data-name="灵感生成的图片">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={img5} />
          </div>
          <div className="absolute h-[393px] left-[948px] top-[413px] w-[296px]" data-name="灵感生成的图片">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={img6} />
          </div>
          <div className="absolute h-[394px] left-0 top-[826px] w-[296px]" data-name="image 278">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage278} />
          </div>
          <div className="absolute h-[394px] left-[316px] top-[826px] w-[296px]" data-name="image 277">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage277} />
          </div>
          <div className="absolute h-[394px] left-[632px] top-[826px] w-[296px]" data-name="image 280">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage280} />
          </div>
          <div className="absolute h-[394px] left-[948px] top-[826px] w-[296px]" data-name="image 281">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage281} />
          </div>
        </div>
        <div className="absolute h-[67.725px] left-[-1px] top-[-1px] w-[1280px]" data-name="image 47">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage47} />
        </div>
        <div className="absolute bg-white content-stretch flex items-center justify-between leading-[0] left-[45px] px-[17px] py-[20px] shadow-[9px_-10px_16.9px_0px_rgba(0,0,0,0.25)] top-[565px] w-[480px]">
          <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0">
            <div className="col-1 h-[70.324px] ml-0 mt-0 pointer-events-none relative row-1 w-[50.329px]" data-name="image 271">
              <img alt="" className="absolute inset-0 max-w-none object-cover size-full" src={imgImage271} />
              <div aria-hidden="true" className="absolute border-[2.221px] border-solid border-white inset-0 shadow-[1.48px_1.48px_1.48px_0px_rgba(0,0,0,0.25)]" />
            </div>
          </div>
          <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0">
            <Text text="更新参考图" additionalClassNames="ml-0" />
            <Text text="历史记录" additionalClassNames="ml-[181px]" />
          </div>
        </div>
      </div>
    </div>
  );
}