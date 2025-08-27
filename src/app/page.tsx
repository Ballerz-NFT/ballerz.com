import Image from "next/image";

export default function Home() {
  return (
    <>
      <main className="flex min-h-screen flex-col items-center py-12 px-4">
        <header className="w-full text-center">
          {/* <h1 className="text-4xl uppercase">Ballerz</h1> */}
          <Image
            src="/images/logo.png"
            width={320}
            height={60}
            alt="Ballerz"
            className="mx-auto pb-4"
          />

          <nav className="font-bold text-center text-lg pb-4">
            <a href="https://x.com/BALLERZ_NFT" target="_blank">
              Twitter
            </a>
            <span className="mx-2"> </span>
            <a href="https://discord.gg/qbuMQgTf8K" target="_blank">
              Discord
            </a>
            <span className="mx-2"> </span>
            <a href="https://bbl.center" target="_blank">
              Play
            </a>
          </nav>

          <p className="speech-bubble w-64 text-xl text-black p-6 mx-auto mt-12">
            Now community owned! Come <br />
            <a href="https://bbl.center" className="underline">
              ball with us
            </a>
            !
          </p>

          <Image
            src="https://ballerz.cloud/images/ballerz/9383/public"
            width={280}
            height={280}
            alt="Baller 9383 - Baller Market Mascot"
            className="mx-auto"
          />
        </header>

        <section className="text-center mx-auto spotlight">
          <iframe
            src="https://ballerznft.substack.com/embed"
            width="480"
            height="150"
            className="signup"
          ></iframe>
        </section>
      </main>
    </>
  );
}
