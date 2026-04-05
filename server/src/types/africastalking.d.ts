declare module 'africastalking' {
  interface AfricasTalkingInstance {
    SMS: {
      send(params: { to: string | string[]; message: string; enqueue?: boolean }): Promise<unknown>
    }
  }

  function initialize(options: { apiKey: string; username: string }): AfricasTalkingInstance
  export default initialize
}
