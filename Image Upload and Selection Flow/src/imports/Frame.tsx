import clsx from "clsx";
import svgPaths from "./svg-femkwy2cgh";
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
import imgImage264 from "figma:asset/836805b290abb7b6b5748066eb04a90c41623e8c.png";
import imgImage47 from "figma:asset/270367ecd171e06ef06fec38965ce8a076c7925b.png";
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

export default function Frame() {
  return (
    <div className="bg-white border border-black border-solid relative size-full" data-name="Frame">
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
        <div className="absolute backdrop-blur-[8.2px] bg-[rgba(255,255,255,0.5)] h-[634px] left-[-20px] top-[-34px] w-[1276px]" />
        <div className="absolute bg-white h-[487.619px] left-[264.06px] overflow-clip shadow-[0px_6.772px_6.772px_0px_rgba(0,0,0,0.25)] top-[20.98px] w-[698.413px]">
          <p className="absolute font-['PingFang_SC:Semibold',sans-serif] leading-[normal] left-[110.94px] not-italic text-[27.09px] text-black top-[38.94px] whitespace-nowrap">上传任意图片，即刻创意生成专属你的地毯</p>
          <div className="absolute h-[320px] left-[23.94px] pointer-events-none top-[102.02px] w-[643px]" data-name="image 264">
            <div className="absolute inset-0 overflow-hidden">
              <img alt="" className="absolute h-full left-[-4.37%] max-w-none top-0 w-[120.9%]" src={imgImage264} />
            </div>
            <div aria-hidden="true" className="absolute border-[0.4px] border-black border-solid inset-0" />
          </div>
          <div className="absolute flex h-[70.468px] items-center justify-center left-[214.94px] top-[269.02px] w-[212.038px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "19" } as React.CSSProperties}>
            <div className="flex-none rotate-[-6.82deg]">
              <div className="bg-black content-stretch flex flex-col items-center justify-center px-[22.011px] py-[13.545px] relative w-[208.036px]">
                <div aria-hidden="true" className="absolute border-[0.423px] border-solid border-white inset-0 pointer-events-none" />
                <p className="font-['PingFang_SC:Semibold',sans-serif] leading-[normal] not-italic relative shrink-0 text-[13.545px] text-white whitespace-nowrap">立刻上传</p>
              </div>
            </div>
          </div>
          <div className="absolute contents left-[320.94px] top-[444.02px]">
            <p className="absolute font-['PingFang_SC:Semibold',sans-serif] leading-[normal] left-[320.94px] not-italic text-[13.545px] text-black top-[444.02px] whitespace-nowrap">稍后再传</p>
          </div>
          <div className="absolute h-0 left-[320.94px] top-[467.02px] w-[52.5px]">
            <div className="absolute inset-[-0.5px_0]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 52.5 1">
                <path d="M0 0.5H52.5" id="Vector 499" stroke="var(--stroke-0, black)" />
              </svg>
            </div>
          </div>
          <div className="absolute left-[667.09px] overflow-clip size-[20.317px] top-[18.62px]" data-name="icon-cross">
            <div className="absolute left-[5.08px] size-[10.159px] top-[5.08px]">
              <div className="absolute inset-[-9.09%_-9.08%_-9.09%_-9.1%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.0063 12.0058">
                  <g id="Group 1">
                    <path d={svgPaths.p2b4c5b00} id="Vector 1" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeWidth="1.84704" />
                    <path d={svgPaths.p3a6ff980} id="Vector 2" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeWidth="1.84704" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute h-[67.725px] left-[-1px] top-[-1px] w-[1280px]" data-name="image 47">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage47} />
      </div>
    </div>
  );
}